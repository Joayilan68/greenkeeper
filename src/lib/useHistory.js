import { useState } from "react";

const KEY = "gk_history_v1";

export function useHistory() {
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  });

  const addEntry = (action) => {
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleDateString("fr-FR"),
      month: new Date().getMonth() + 1,
      action,
    };
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, 60);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeEntry = (id) => {
    setHistory(prev => {
      const next = prev.filter(x => x.id !== id);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  return { history, addEntry, removeEntry };
}
