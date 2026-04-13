// src/lib/useHistory.js
// ─────────────────────────────────────────────────────────────────────────────
// Cache-first : localStorage pour lecture instantanée
//               Supabase pour persistance cross-device
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { supabase } from "./supabase";

const KEY = "gk_history_v1";
const MAX = 60;

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}

function saveLocal(history) {
  try { localStorage.setItem(KEY, JSON.stringify(history.slice(0, MAX))); } catch {}
}

export function useHistory() {
  const { userId, isSignedIn } = useAuth();
  const [history, setHistory]  = useState(loadLocal);
  const [synced, setSynced]    = useState(false);

  // ── Sync Supabase → local au montage ──────────────────────────────────────
  useEffect(() => {
    if (!isSignedIn || !userId) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("histories")
          .select("id, action, date, month, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(MAX);

        if (!error && data?.length) {
          const remote = data.map(r => ({
            id:     r.id,
            action: r.action,
            date:   r.date,
            month:  r.month,
          }));
          setHistory(remote);
          saveLocal(remote);
        }
        setSynced(true);
      } catch {
        setSynced(true);
      }
    })();
  }, [isSignedIn, userId]); // eslint-disable-line

  // ── addEntry ──────────────────────────────────────────────────────────────
  const addEntry = (action) => {
    const entry = {
      id:     Date.now(),
      date:   new Date().toLocaleDateString("fr-FR"),
      month:  new Date().getMonth() + 1,
      action,
    };

    // Local immédiat
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, MAX);
      saveLocal(next);
      return next;
    });

    // Supabase async
    if (isSignedIn && userId) {
      supabase.from("histories").insert({
        user_id: userId,
        action:  entry.action,
        date:    entry.date,
        month:   entry.month,
      }).then(({ error }) => {
        if (error) console.warn("[MG360] histories insert:", error.message);
      });
    }
  };

  // ── removeEntry ───────────────────────────────────────────────────────────
  const removeEntry = (id) => {
    setHistory(prev => {
      const next = prev.filter(x => x.id !== id);
      saveLocal(next);
      return next;
    });

    // Supabase : supprimer si c'est un UUID (entrée remote)
    if (isSignedIn && userId && typeof id === "string" && id.includes("-")) {
      supabase.from("histories")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)
        .then(({ error }) => {
          if (error) console.warn("[MG360] histories delete:", error.message);
        });
    }
  };

  return { history, addEntry, removeEntry, synced };
}
