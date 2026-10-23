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
  geolocation:     false,
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
          .maybeSingle();

        if (error) return; // lecture impossible : ne rien écrire (une écriture de secours écraserait les vrais choix)
        if (data) {
          const remote = {
            cgu:             data.cgu             ?? false,
            confidentialite: data.confidentialite ?? false,
            notifications:   data.notifications   ?? false,
            marketing:       data.marketing        ?? false,
            data_resale:     data.data_resale      ?? false,
            cookies:         data.cookies          ?? false,
            geolocation:     data.geolocation      ?? false,
            push_active:     data.push_active      ?? false,
            email_active:    data.email_active     ?? false,
          };
          setConsents(remote);
          saveLocal(remote); // mettre à jour le cache légal
        } else {
          // Pas encore de ligne → reprendre CGU et confidentialité acceptées sur cet appareil (seul contenu du cache
          // local), jamais les autres consentements : à l'inscription, cette lecture peut précéder l'enregistrement des
          // choix de Register, et les remettre à faux (case « conseils de Bob » cochée mais enregistrée « non »).
          const local = loadLocal() || {};
          const legal = {};
          LEGAL_KEYS.forEach(k => { if (local[k] === true) legal[k] = true; });
          if (Object.keys(legal).length) {
            setConsents(c => ({ ...c, ...legal }));
            await supabase.from("user_consents").upsert(
              { user_id: userId, ...legal, updated_at: new Date().toISOString() },
              { onConflict: "user_id" }
            );
          }
        }
      } catch {}
      finally { setLoading(false); setSynced(true); }
    })();
  }, [isSignedIn, userId]); // eslint-disable-line

  // ── Sauvegarder un consentement ──────────────────────────────────────────
  // État et cache local mis à jour à partir de la valeur courante, pas d'une copie figée au rendu : deux
  // enregistrements rapprochés (Register puis rappels) ne doivent pas se défaire l'un l'autre
  const updateConsent = useCallback(async (key, value) => {
    setConsents(c => ({ ...c, [key]: value }));
    saveLocal({ [key]: value });

    if (!isSignedIn || !userId) return;
    try {
      const { error } = await supabase.from("user_consents").upsert(
        { user_id: userId, [key]: value, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      if (error) console.warn(`[MG360] Consentement « ${key} » non enregistré :`, error.message);
    } catch {}
  }, [isSignedIn, userId]);

  // ── Sauvegarder plusieurs consentements en une fois ──────────────────────
  const updateConsents = useCallback(async (patch) => {
    setConsents(c => ({ ...c, ...patch }));
    saveLocal(patch);

    if (!isSignedIn || !userId) return;
    try {
      const { error } = await supabase.from("user_consents").upsert(
        { user_id: userId, ...patch, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      if (error) console.warn("[MG360] Consentements non enregistrés :", error.message);
    } catch {}
  }, [isSignedIn, userId]);

  // ── Sync push_active / email_active depuis les rappels ───────────────────
  // Appelé par useReminders après chaque changement de rappel.
  // IMPORTANT : ne met à jour QUE les indicateurs informatifs push_active/email_active.
  // notifications et marketing sont pilotés EXCLUSIVEMENT par les toggles de Paramètres —
  // syncFromReminders ne doit JAMAIS les rabaisser (ancien bug qui écrasait le consentement
  // et empêchait l'envoi des push pour presque tous les utilisateurs).
  const syncFromReminders = useCallback(async (reminders) => {
    if (!reminders || typeof reminders !== "object") return;

    // Filtrer pour ne garder QUE les objets réels (guard ancien format localStorage)
    const vals = Object.values(reminders).filter(
      r => r !== null && typeof r === "object"
    );

    const pushActive  = vals.some(r => r.enabled === true && r.push  === true);
    const emailActive = vals.some(r => r.enabled === true && r.email === true);

    // On NE touche PLUS à notifications / marketing ici.
    await updateConsents({ push_active: pushActive, email_active: emailActive });
  }, [updateConsents]);

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
