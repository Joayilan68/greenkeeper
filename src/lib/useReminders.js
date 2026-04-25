// src/lib/useReminders.js
import { useState, useEffect } from "react";

const KEY = "mg360_reminders";

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
    [r.id]: { enabled: false, days: r.defaultDays, lastSent: null, email: false, push: false }
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

  // ── Envoi réel des rappels dus (push + email) ─────────────────────────────
  // Appelé 1x/jour depuis Dashboard au chargement.
  const sendDueReminders = async ({ user, profile, score, history = [], subscription }) => {
    // Rate limit : 1 envoi max par jour
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(`mg360_reminders_sent_${today}`)) return;

    // Vérifier les consentements (Settings)
    let consents = {};
    try {
      const c = localStorage.getItem("mg360_consents");
      if (c) consents = JSON.parse(c);
    } catch {}

    const due = getDueReminders(history);
    if (!due.length) return;

    const sub = subscription || JSON.parse(localStorage.getItem("gk_push_sub") || "null");
    const sentIds = new Set();

    // ── Push : consentement global ON + permission navigateur + souscription ─
    if (consents.notifications && sub && Notification.permission === "granted") {
      for (const r of due.filter(r => reminders[r.id]?.push)) {
        try {
          await fetch("/api/send?type=notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subscription: sub,
              notification: {
                title: `🌿 Mongazon360 — ${r.label}`,
                body: `Il est temps de faire votre ${r.label.toLowerCase()} !`,
                tag: `reminder-${r.id}`,
                actionRoute: "/today",
              },
            }),
          });
          sentIds.add(r.id);
        } catch {}
      }
    }

    // ── Email : consentement marketing ON + email disponible ─────────────────
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    if (consents.marketing && userEmail) {
      const emailDue = due.filter(r => reminders[r.id]?.email);
      if (emailDue.length > 0) {
        try {
          await fetch("/api/send?type=reminder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reminders: emailDue.map(r => ({
                icon: r.icon, label: r.label, desc: r.desc,
                days: reminders[r.id]?.days || r.defaultDays,
              })),
              userEmail,
              userName: user?.firstName || "Jardinier",
              profile,
              score,
            }),
          });
          emailDue.forEach(r => sentIds.add(r.id));
        } catch {}
      }
    }

    // ── Batch markSent — 1 seul appel setState ───────────────────────────────
    if (sentIds.size > 0) {
      const now = new Date().toISOString();
      const updated = { ...reminders };
      sentIds.forEach(id => { updated[id] = { ...updated[id], lastSent: now }; });
      save(updated);
    }

    localStorage.setItem(`mg360_reminders_sent_${today}`, "1");
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

  return { reminders, toggle, setDays, toggleChannel, markSent, activeCount, getDueReminders, sendDueReminders };
}
