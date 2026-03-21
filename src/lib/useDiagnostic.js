// src/lib/useDiagnostic.js
import { useState, useEffect } from "react";

const KEY = "gk_diagnostics";
const MAX = 20; // max historique

export function useDiagnostic() {
  const [diagnostics, setDiagnostics] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setDiagnostics(JSON.parse(saved));
    } catch {}
  }, []);

  const save = (diag) => {
    const updated = [diag, ...diagnostics].slice(0, MAX);
    setDiagnostics(updated);
    try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch {}
    return updated;
  };

  const remove = (id) => {
    const updated = diagnostics.filter(d => d.id !== id);
    setDiagnostics(updated);
    try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch {}
  };

  const clear = () => {
    setDiagnostics([]);
    try { localStorage.removeItem(KEY); } catch {}
  };

  const last = diagnostics[0] || null;

  return { diagnostics, save, remove, clear, last };
}
