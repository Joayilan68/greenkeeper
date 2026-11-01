// src/lib/useStreak.js
// Série de jours d'utilisation (décision de Jordan du 1/11/2026) : calculée par la base (fonction compter_jour_serie, date
// de Paris), la même sur tous les appareils, sans stockage local ; quotidienne toute l'année : un jour sans ouvrir l'app la
// remet à zéro, hiver compris. enregistrerConnexion() compte le jour (Accueil, Aujourd'hui) ; les autres écrans lisent la
// ligne streaks du compte, gardée pour toute la session.
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { supabase } from "./supabase";

// Anciennes versions : série gardée dans le navigateur (perdue au nettoyage des données), effacée
try { localStorage.removeItem("mg360_streak"); localStorage.removeItem("gk_streak"); } catch { /* stockage indisponible */ }

const jourParis = () => new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
const veilleDe = (jour) => { const d = new Date(`${jour}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };

// Ligne du compte partagée par tous les écrans ouverts (lue une fois par session, mise à jour par enregistrerConnexion)
let memoire = { userId: null, ligne: null };
const abonnes = new Set();
const publier = (userId, ligne) => { memoire = { userId, ligne }; abonnes.forEach(f => f(memoire)); };

export function useStreak() {
  const { userId, isSignedIn } = useAuth();
  const [etat, setEtat] = useState(memoire);

  useEffect(() => {
    abonnes.add(setEtat);
    if (isSignedIn && userId && memoire.userId !== userId) {
      memoire = { userId, ligne: null };
      supabase.from("streaks").select("actuel, record, dernier_jour, milestones").eq("user_id", userId).maybeSingle()
        .then(({ data, error }) => { if (!error && memoire.userId === userId && !memoire.ligne) publier(userId, data || null); });
    }
    return () => abonnes.delete(setEtat);
  }, [isSignedIn, userId]);

  // Compte le jour dans la série (une fois par jour côté base) et renvoie la ligne à jour, ou null
  const enregistrerConnexion = useCallback(async () => {
    if (!isSignedIn || !userId) return null;
    const { data, error } = await supabase.rpc("compter_jour_serie");
    if (error || !data) return null;
    publier(userId, data);
    return data;
  }, [isSignedIn, userId]);

  const ligne = etat.userId === userId ? etat.ligne : null;
  const aujourdhui = jourParis(), hier = veilleDe(aujourdhui);
  const enCours = !!ligne?.dernier_jour && (ligne.dernier_jour === aujourdhui || ligne.dernier_jour === hier);
  const actuel = enCours ? ligne.actuel || 0 : 0; // série perdue si le dernier jour compté est avant hier
  const enDanger = actuel >= 2 && ligne.dernier_jour === hier; // pas encore comptée aujourd'hui

  return { actuel, record: ligne?.record || 0, enDanger, enregistrerConnexion };
}
