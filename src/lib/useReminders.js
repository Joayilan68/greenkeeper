// src/lib/useReminders.js
import { useState, useEffect } from "react";

const KEY = "gk_reminders";

export const REMINDER_TYPES = [
  { id:"tonte",     icon:"✂️", label:"Tonte",               defaultDays:7,  desc:"Fréquence de tonte recommandée" },
  { id:"arrosage",  icon:"💧", label:"Arrosage",             defaultDays:3,  desc:"Rappel d'arrosage régulier" },
  { id:"engrais",   icon:"🌱", label:"Engrais",              defaultDays:30, desc:"Application d'engrais" },
  { id:"fongicide", icon:"💊", label:"Traitement fongicide", defaultDays:14, desc:"Prévention maladies fongiques" },
  { id:"aeration",  icon:"🌀", label:"Aération",             defaultDays:90, desc:"Aération du sol" },
  { id:"desherbage",icon:"🪴", label:"Désherbage",           defaultDays:14, desc:"Élimination des mauvaises herbes" },
];

const defaultReminders = () =>
  REMINDER_TYPES.reduce((acc, r) => ({
    ...acc,
    [r.id]: { enabled: false, days: r.defaultDays, lastSent: null, email: true, push: true }
  }), {});

export function useReminders() {
  const [reminders, setReminders] = useState(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (!saved) return defaultReminders();
      // Merge avec les defaults pour ajouter de nouveaux types
      return { ...defaultReminders(), ...JSON.parse(saved) };
    } catch { return defaultReminders(); }
  });

  const save = (updated) => {
    setReminders(updated);
    try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch {}
  };

  const toggle = (id) => {
    save({ ...reminders, [id]: { ...reminders[id], enabled: !reminders[id].enabled } });
  };

  const setDays = (id, days) => {
    save({ ...reminders, [id]: { ...reminders[id], days: parseInt(days) } });
  };

  const toggleChannel = (id, channel) => {
    save({ ...reminders, [id]: { ...reminders[id], [channel]: !reminders[id][channel] } });
  };

  const markSent = (id) => {
    save({ ...reminders, [id]: { ...reminders[id], lastSent: new Date().toISOString() } });
  };

  const activeCount = Object.values(reminders).filter(r => r.enabled).length;

  // Vérifie quels rappels sont dus aujourd'hui
  const getDueReminders = (history = []) => {
    const daysSinceAction = (keyword) => {
      const found = history.filter(h => h.action?.toLowerCase().includes(keyword));
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
        const r         = reminders[type.id];
        const daysSince = daysSinceAction(type.id === "desherbage" ? "désherbage" : type.id);
        return daysSince >= r.days;
      });
  };

  return { reminders, toggle, setDays, toggleChannel, markSent, activeCount, getDueReminders };
}
