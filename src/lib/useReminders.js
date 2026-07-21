// src/lib/useReminders.js
// ─────────────────────────────────────────────────────────────────────────────
// Supabase = source UNIQUE de vérité pour les préférences de rappels.
// Plus de cache localStorage — tout est lu/écrit directement en base.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { supabase } from "./supabase";

// Fréquences fixes calquées sur la Knowledge Base v4
// L'utilisateur ne choisit pas la fréquence — elle est agronomique
export const REMINDER_TYPES = [
  { id:"tonte",     icon:"✂️", label:"Tonte",               desc:"Printemps/automne : 5-7j • Été : 4-5j" },
  { id:"arrosage",  icon:"💧", label:"Arrosage",             desc:"Selon météo et type de sol" },
  { id:"engrais",   icon:"🌱", label:"Engrais",              desc:"Délai min. 45 jours entre applications" },
  { id:"fongicide", icon:"💊", label:"Traitement fongicide", desc:"Si conditions à risque détectées" },
  { id:"aeration",  icon:"🌀", label:"Aération",             desc:"1-2 fois/an • délai min. 90 jours" },
  { id:"desherbage",icon:"🪴", label:"Désherbage",           desc:"Délai min. 21 jours entre traitements" },
];

const defaultReminders = () =>
  REMINDER_TYPES.reduce((acc, r) => ({
    ...acc,
    [r.id]: { enabled: false, lastSent: null, email: false, push: false }
  }), {});

export function useReminders(syncFromReminders) {
  const { userId, isSignedIn } = useAuth();
  const [reminders, setReminders] = useState(defaultReminders);
  const [synced, setSynced]       = useState(false);

  // ── Lecture Supabase au montage — source unique ────────────────────────────
  useEffect(() => {
    if (!isSignedIn || !userId) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("reminders")
          .select("preferences")
          .eq("user_id", userId)
          .single();

        if (!error && data?.preferences && Object.keys(data.preferences).length > 0) {
          // Nettoyer le champ "days" résiduel (ancien format obsolète)
          const remote = { ...defaultReminders() };
          Object.keys(remote).forEach(id => {
            if (data.preferences[id] && typeof data.preferences[id] === "object") {
              const { days: _removed, ...rest } = data.preferences[id];
              remote[id] = { ...remote[id], ...rest };
            }
          });
          setReminders(remote);
        } else {
          // Pas encore de ligne pour cet utilisateur → créer la ligne par défaut en base
          const defaults = defaultReminders();
          setReminders(defaults);
          await supabase.from("reminders").upsert(
            { user_id: userId, preferences: defaults, consents: {}, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );
        }
        setSynced(true);
      } catch {
        setSynced(true); // pas bloquant
      }
    })();
  }, [isSignedIn, userId]); // eslint-disable-line

  // ── save : écrit directement en Supabase, plus de cache local ─────────────
  const save = (updated) => {
    setReminders(updated);

    if (isSignedIn && userId) {
      supabase.from("reminders").upsert(
        { user_id: userId, preferences: updated, consents: {}, updated_at: new Date().toISOString() },
        { onConflict: "user_id", ignoreDuplicates: false }
      ).then(({ error }) => {
        if (error) console.warn("[MG360] reminders upsert:", error.message);
      });
    }

    // Sync consentements push/email dérivés (push_active / email_active)
    if (typeof syncFromReminders === "function") {
      syncFromReminders(updated).catch(() => {});
    }
  };

  const toggle = (id) => {
    const current = (reminders[id] && typeof reminders[id] === "object")
      ? reminders[id]
      : { enabled: false, lastSent: null, email: false, push: false };
    const nowEnabled = !current.enabled;
    // ✅ FIX maillon 2 (18/07/2026) : activer un rappel active aussi son canal push,
    // désactiver le rappel désactive le push. Avant : enabled changeait seul, push
    // restait bloqué à false tant que toggleChannel(id,"push") n'était pas appelé séparément.
    save({ ...reminders, [id]: { ...current, enabled: nowEnabled, push: nowEnabled } });
  };

  const toggleChannel = (id, channel) => {
    const current = (reminders[id] && typeof reminders[id] === "object")
      ? reminders[id]
      : { enabled: false, lastSent: null, email: false, push: false };
    save({ ...reminders, [id]: { ...current, [channel]: !current[channel] } });
  };

  // ✅ Ajout (18/07/2026) : active/désactive TOUS les types de rappels en un seul
  // geste — utilisé par le toggle unique "Notifications push" des Réglages.
  // Conserve lastSent existant pour ne pas fausser les intervalles agronomiques.
  const enableAll = () => {
    const updated = {};
    REMINDER_TYPES.forEach(t => {
      const current = reminders[t.id] || {};
      updated[t.id] = { ...current, enabled: true, push: true };
    });
    save(updated);
  };

  const disableAll = () => {
    const updated = {};
    REMINDER_TYPES.forEach(t => {
      const current = reminders[t.id] || {};
      updated[t.id] = { ...current, enabled: false, push: false };
    });
    save(updated);
  };

  const markSent = (id) => {
    const current = (reminders[id] && typeof reminders[id] === "object")
      ? reminders[id]
      : { enabled: false, lastSent: null, email: false, push: false };
    save({ ...reminders, [id]: { ...current, lastSent: new Date().toISOString() } });
  };

  const activeCount = Object.values(reminders || {}).filter(
    r => r !== null && typeof r === "object" && r.enabled === true
  ).length;

  // Vérifie quels rappels sont dus (basé sur historique réel, pas sur "days" config)
  const getDueReminders = (history = []) => {
    if (!reminders || typeof reminders !== "object") return [];
    const safeHistory = Array.isArray(history) ? history : [];
    const INTERVALLES = {
      tonte:     5,  // printemps/automne (été géré dynamiquement)
      arrosage:  3,
      engrais:   45,
      fongicide: 14,
      aeration:  90,
      desherbage:21,
    };
    const daysSinceAction = (keyword) => {
      const found = safeHistory.filter(h => h?.action?.toLowerCase().includes(keyword));
      if (!found.length) return 999;
      const latest = found[found.length - 1];
      try {
        const [d, m, y] = latest.date.split("/");
        return Math.floor((Date.now() - new Date(y, m-1, d).getTime()) / 86400000);
      } catch { return 999; }
    };
    return REMINDER_TYPES
      .filter(type => {
        const r = reminders[type.id];
        return r && typeof r === "object" && r.enabled === true;
      })
      .filter(type => {
        const daysSince = daysSinceAction(type.id === "desherbage" ? "désherbage" : type.id);
        return daysSince >= (INTERVALLES[type.id] || 7);
      });
  };

  return { reminders, toggle, toggleChannel, enableAll, disableAll, markSent, activeCount, getDueReminders, synced };
}
