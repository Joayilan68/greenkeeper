// src/lib/useReminders.js
// ─────────────────────────────────────────────────────────────────────────────
// Supabase = source de vérité pour les préférences de rappels
// localStorage = cache fallback si offline
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { supabase } from "./supabase";

const KEY = "mg360_reminders";

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

function loadLocal() {
  try {
    const saved = localStorage.getItem(KEY);
    if (!saved) return defaultReminders();
    const parsed = JSON.parse(saved);
    // Merge avec les defaults pour ajouter de nouveaux types éventuels
    // On supprime le champ "days" s'il existe — la fréquence est désormais fixe
    const merged = { ...defaultReminders() };
    Object.keys(merged).forEach(id => {
      if (parsed[id]) {
        const { days: _removed, ...rest } = parsed[id]; // supprimer days résiduel
        merged[id] = { ...merged[id], ...rest };
      }
    });
    return merged;
  } catch { return defaultReminders(); }
}

function saveLocal(r) {
  try { localStorage.setItem(KEY, JSON.stringify(r)); } catch {}
}

export function useReminders(syncFromReminders) {
  const { userId, isSignedIn } = useAuth();
  const [reminders, setReminders] = useState(loadLocal);
  const [synced, setSynced]       = useState(false);

  // ── Lecture Supabase au montage ────────────────────────────────────────────
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
          // Supabase prioritaire — nettoyer le champ "days" résiduel
          const remote = { ...defaultReminders() };
          Object.keys(remote).forEach(id => {
            if (data.preferences[id]) {
              const { days: _removed, ...rest } = data.preferences[id];
              remote[id] = { ...remote[id], ...rest };
            }
          });
          setReminders(remote);
          saveLocal(remote);
        } else {
          // Supabase vide → migration depuis localStorage
          const local = loadLocal();
          await supabase.from("reminders").upsert(
            { user_id: userId, preferences: local, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );
        }
        setSynced(true);
      } catch {
        setSynced(true); // pas bloquant
      }
    })();
  }, [isSignedIn, userId]); // eslint-disable-line

  // ── save : local immédiat + Supabase async ────────────────────────────────
  const save = (updated) => {
    setReminders(updated);
    saveLocal(updated);

    // Sync Supabase
    if (isSignedIn && userId) {
      supabase.from("reminders").upsert(
        { user_id: userId, preferences: updated, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      ).then(({ error }) => {
        if (error) console.warn("[MG360] reminders upsert:", error.message);
      });
    }

    // Sync consentements push/email (comportement existant)
    if (typeof syncFromReminders === "function") {
      syncFromReminders(updated).catch(() => {});
    }
  };

  const toggle = (id) => {
    save({ ...reminders, [id]: { ...reminders[id], enabled: !reminders[id].enabled } });
  };

  const toggleChannel = (id, channel) => {
    save({ ...reminders, [id]: { ...reminders[id], [channel]: !reminders[id][channel] } });
  };

  const markSent = (id) => {
    save({ ...reminders, [id]: { ...reminders[id], lastSent: new Date().toISOString() } });
  };

  // ── syncToServer — endpoint push/email (comportement existant conservé) ───
  const syncToServer = async (userId, email, consents) => {
    if (!userId) return;
    try {
      const prefs = JSON.parse(localStorage.getItem(KEY) || "{}");
      await fetch("/api/send?type=save-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email: email || null, preferences: prefs, consents: consents || {} }),
      });
    } catch {}
  };

  const activeCount = Object.values(reminders || {}).filter(r => r?.enabled).length;

  // Vérifie quels rappels sont dus (basé sur historique réel, pas sur "days" config)
  const getDueReminders = (history = []) => {
    if (!reminders || typeof reminders !== "object") return [];
    const safeHistory = Array.isArray(history) ? history : [];
    // Intervalles agronomiques fixes KB v4
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
      .filter(type => reminders[type.id]?.enabled)
      .filter(type => {
        const daysSince = daysSinceAction(type.id === "desherbage" ? "désherbage" : type.id);
        return daysSince >= (INTERVALLES[type.id] || 7);
      });
  };

  return { reminders, toggle, toggleChannel, markSent, activeCount, getDueReminders, syncToServer, synced };
}
