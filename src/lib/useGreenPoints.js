// src/lib/useGreenPoints.js
// GreenPoints enregistrés un par un dans la base (décision de Jordan du 10/11/2026 : aucune donnée d'un utilisateur perdue).
// Chaque gain passe par la fonction gagner_greenpoints de la base, seule à connaître les règles (points, plafonds, délais,
// pause d'hiver, défi et quiz de la ligue réellement faits) et à écrire : journal greenpoints_events, jamais modifié, et
// ligne greenpoints du compte (total, historique). L'app lit cette ligne une fois par session, partagée par tous les écrans
// ouverts. Les points gardés dans le navigateur par les anciennes versions sont repris une fois (reprendre_greenpoints).
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { supabase } from "./supabase";

const ANCIENNE_CLE = "mg360_greenpoints"; // points gardés dans le navigateur avant le 10/11/2026
const VIDE = [];

export const GP_PALIERS = [
  { id: "semis",    label: "Semis",    icone: "🌱", min: 0,     couleur: "#81c784" },
  { id: "pousse",   label: "Pousse",   icone: "🌿", min: 500,   couleur: "#43a047" },
  { id: "gazon",    label: "Gazon",    icone: "🌳", min: 2000,  couleur: "#2e7d32" },
  { id: "champion", label: "Champion", icone: "🏆", min: 6000,  couleur: "#f9a825" },
  { id: "legende",  label: "Légende",  icone: "💎", min: 15000, couleur: "#7b1fa2" },
];

export function getPalier(total) {
  return [...GP_PALIERS].reverse().find(p => total >= p.min) || GP_PALIERS[0];
}
export function getProchaingPalier(total) {
  return GP_PALIERS.find(p => p.min > total) || null;
}

// Ligne du compte partagée par tous les écrans ouverts ({ total, historique }, null tant qu'elle n'est pas lue)
let memoire = { userId: null, ligne: null };
let gains = 0; // gains accordés pendant la session : une lecture commencée avant un gain est refaite
const abonnes = new Set();
const publier = (userId, ligne) => { memoire = { userId, ligne }; abonnes.forEach(f => f(memoire)); };

// Points restés dans le navigateur (gain pas envoyé, ou effacé par un autre appareil) : envoyés une fois à la base, qui
// vérifie chaque entrée. Seulement si cet historique est celui du compte (au moins une entrée commune) : sinon c'est
// celui d'un autre compte du même navigateur, laissé tel quel.
async function reprendreNavigateur(ligne) {
  let local = null;
  try { local = JSON.parse(localStorage.getItem(ANCIENNE_CLE)); } catch { return ligne; }
  if (!local) return ligne;
  const entrees = (Array.isArray(local.historique) ? local.historique : []).filter(h => h?.action && Number.isFinite(h.date));
  const cle = (h) => `${h.action}|${h.date}`;
  const enBase = new Set(ligne.historique.map(cle));
  if (entrees.length && !entrees.some(h => enBase.has(cle(h)))) return ligne;
  if (entrees.some(h => !enBase.has(cle(h)))) {
    const { data, error } = await supabase.rpc("reprendre_greenpoints", { p_entrees: entrees.map(({ action, date }) => ({ action, date })) });
    if (error || !data || data.raison) return ligne; // réessayé au prochain lancement
    ligne = { total: data.total || 0, historique: data.historique || VIDE };
  }
  try { localStorage.removeItem(ANCIENNE_CLE); } catch { /* stockage indisponible */ }
  return ligne;
}

async function charger(userId) {
  const debut = gains;
  const { data, error } = await supabase.from("greenpoints").select("total, historique").eq("user_id", userId).maybeSingle();
  if (memoire.userId !== userId) return;
  if (error) { memoire = { userId: null, ligne: null }; return; } // relue à l'ouverture du prochain écran
  const ligne = await reprendreNavigateur({ total: data?.total || 0, historique: data?.historique || VIDE });
  if (memoire.userId !== userId) return;
  if (gains !== debut) return charger(userId);
  publier(userId, ligne);
}

export function useGreenPoints() {
  const { userId, isSignedIn } = useAuth();
  const [etat, setEtat] = useState(memoire);

  useEffect(() => {
    abonnes.add(setEtat);
    if (isSignedIn && userId && memoire.userId !== userId) {
      memoire = { userId, ligne: null };
      charger(userId);
    }
    return () => abonnes.delete(setEtat);
  }, [isSignedIn, userId]);

  // Gain d'une action, accordé ou refusé par la base (raison : hiver, plafond_atteint, non_fait, action_inconnue)
  const gagnerPoints = useCallback(async (action) => {
    if (!isSignedIn || !userId) return { succes: false, points: 0 };
    const { data, error } = await supabase.rpc("gagner_greenpoints", { p_action: action });
    if (error || !data) return { succes: false, raison: "erreur", points: 0 };
    if (data.succes) {
      gains++;
      const ligne = memoire.userId === userId ? memoire.ligne : null;
      if (ligne) {
        const deja = ligne.historique.some(h => h.action === data.entree.action && h.date === data.entree.date);
        publier(userId, { total: data.total, historique: deja ? ligne.historique : [...ligne.historique, data.entree] });
      }
    }
    return { ...data, palier: getPalier(data.total || 0) };
  }, [isSignedIn, userId]);

  const ligne = etat.userId === userId ? etat.ligne : null;
  const total = ligne?.total || 0;
  const palier = getPalier(total);
  const prochainPalier = getProchaingPalier(total);
  const progressPalier = prochainPalier ? Math.round(((total - palier.min) / (prochainPalier.min - palier.min)) * 100) : 100;

  return { charge: !!ligne, total, historique: ligne?.historique || VIDE, palier, prochainPalier, progressPalier, gagnerPoints };
}
