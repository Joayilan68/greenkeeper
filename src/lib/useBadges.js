// src/lib/useBadges.js
// ─────────────────────────────────────────────────────────────────────────────
// Badges collectionnables (RARES & MÉRITÉS) — repris de la KB "Badges & Objectifs".
// Philosophie : chaque badge = un vrai exploit, symbolique (PAS de points bonus,
// les GreenPoints restent le système courant).
//
// Détection 100 % CLIENT, stockage dans profiles.data.badges (upsert via useProfile,
// chemin existant). AUCUNE modification serveur : les parcours terminés sont lus
// directement ici (lecture seule).
//
// 7 badges détectés maintenant ; 3 en "bientôt" (nécessitent de nouveaux compteurs) :
//   #7  germination_parfaite  → suivi "arrosage germination J/J" à ajouter
//   #9  champion_printemps    → suivi saisonnier à ajouter
//   #10 maitre_automne        → suivi saisonnier à ajouter
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { supabase } from "./supabase";

export const BADGES = [
  { id:"createur_gazon",       emoji:"🌱", nom:"Créateur de gazon",     categorie:"Accomplissement", acces:"Gratuit", rarete:"Rare",            condition:"Terminer un parcours de création complet (~60 jours)",           felicitation:"Vous avez créé une pelouse de zéro. Un vrai accomplissement de jardinier 🌱" },
  { id:"regarnissage_reussi",  emoji:"🔧", nom:"Regarnissage réussi",   categorie:"Accomplissement", acces:"Gratuit", rarete:"Rare",            condition:"Terminer un parcours de regarnissage complet",                   felicitation:"Votre pelouse a retrouvé sa densité. Beau travail 🔧" },
  { id:"sauveteur_pelouse",    emoji:"🩺", nom:"Sauveteur de pelouse",  categorie:"Accomplissement", acces:"Gratuit", rarete:"Très rare",       condition:"Faire passer un gazon d'un score < 40 à un score > 70",          felicitation:"Vous avez ressuscité votre gazon ! De 40 à 70+, chapeau 🩺" },
  { id:"gazon_exception",      emoji:"🏆", nom:"Gazon d'exception",     categorie:"Accomplissement", acces:"Gratuit", rarete:"Très rare",       condition:"Atteindre un score de santé > 90",                               felicitation:"Score > 90 : votre gazon est dans le top. Impressionnant 🏆" },
  { id:"assidu_30",            emoji:"🔥", nom:"Assidu (30 jours)",     categorie:"Régularité",      acces:"Gratuit", rarete:"Rare",            condition:"Maintenir un streak de 30 jours consécutifs",                    felicitation:"30 jours d'affilée ! La régularité paie 🔥" },
  { id:"inebranlable_100",     emoji:"💎", nom:"Inébranlable (100 j)",  categorie:"Régularité",      acces:"Gratuit", rarete:"Très rare",       condition:"Maintenir un streak de 100 jours consécutifs",                   felicitation:"100 jours sans faillir. Vous êtes une légende du gazon 💎" },
  { id:"germination_parfaite", emoji:"💧", nom:"Germination parfaite",  categorie:"Régularité",      acces:"Gratuit", rarete:"Rare",            condition:"21 jours d'arrosage de germination sans en rater un seul",       felicitation:"21 jours d'arrosage sans faute : vos graines vous remercient 💧", bientot:true },
  { id:"oeil_expert",          emoji:"📸", nom:"Œil expert",            categorie:"Maîtrise",        acces:"Premium", rarete:"Rare",            condition:"Réaliser 10 diagnostics photo IA",                               felicitation:"10 diagnostics : vous suivez votre gazon comme un pro 📸" },
  { id:"champion_printemps",   emoji:"🌸", nom:"Champion du Printemps", categorie:"Saisonnier",      acces:"Gratuit", rarete:"Édition limitée", condition:"Suivre une saison de printemps complète (mars→juin) sans interruption", felicitation:"Champion du Printemps ! Badge non reconductible 🌸", bientot:true },
  { id:"maitre_automne",       emoji:"🍂", nom:"Maître de l'Automne",   categorie:"Saisonnier",      acces:"Gratuit", rarete:"Édition limitée", condition:"Suivre une saison d'automne complète (août→nov) sans interruption",     felicitation:"Maître de l'Automne ! Collectionnez les saisons 🍂", bientot:true },
];

// profile = profiles.data (blob JSON) ; saveProfile = upsert existant (useProfile)
export function useBadges({ profile, saveProfile, score, diagnostics = [], streak = {}, isPaid = false }) {
  const { userId, isSignedIn } = useAuth();
  const [completed, setCompleted] = useState({ creation: false, regarnissage: false });
  const [justUnlocked, setJustUnlocked] = useState([]);

  // ── Parcours TERMINÉS (lecture seule, aucune modif serveur) ────────────────
  useEffect(() => {
    if (!isSignedIn || !userId) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("parcours")
          .select("type")
          .eq("user_id", userId)
          .eq("statut", "termine");
        const types = new Set((data || []).map(p => p.type));
        setCompleted({ creation: types.has("creation"), regarnissage: types.has("regarnissage") });
      } catch { /* pas bloquant */ }
    })();
  }, [isSignedIn, userId]);

  // ── Détection + persistance (idempotent, first-touch : jamais réécrit) ─────
  useEffect(() => {
    if (!profile) return;

    const dejaBadges = (profile.badges && typeof profile.badges === "object" && !Array.isArray(profile.badges))
      ? profile.badges : {};

    // scoreMin (mémoire du plus bas score atteint → badge "Sauveteur")
    const scoreValide = typeof score === "number" && !isNaN(score);
    const ancienMin   = typeof profile.scoreMin === "number" ? profile.scoreMin : (scoreValide ? score : null);
    const nouveauMin  = (scoreValide && ancienMin != null) ? Math.min(ancienMin, score) : ancienMin;

    const nbDiag = Array.isArray(diagnostics) ? diagnostics.length : 0;
    const record = typeof streak.record === "number" ? streak.record
                 : (typeof streak.actuel === "number" ? streak.actuel : 0);

    const conditions = {
      createur_gazon:       completed.creation,
      regarnissage_reussi:  completed.regarnissage,
      sauveteur_pelouse:    nouveauMin != null && nouveauMin < 40 && scoreValide && score > 70,
      gazon_exception:      scoreValide && score > 90,
      assidu_30:            record >= 30,
      inebranlable_100:     record >= 100,
      germination_parfaite: false, // #7 reporté — suivi à ajouter
      oeil_expert:          nbDiag >= 10,
      champion_printemps:   false, // #9 reporté — suivi saisonnier à ajouter
      maitre_automne:       false, // #10 reporté — suivi saisonnier à ajouter
    };

    const nouveaux = [];
    const badges = { ...dejaBadges };
    for (const b of BADGES) {
      if (conditions[b.id] && !badges[b.id]) {
        badges[b.id] = { at: new Date().toISOString() };
        nouveaux.push(b);
      }
    }

    const minChange = nouveauMin != null && nouveauMin !== ancienMin;
    // Déps volontairement sans `profile` (objet) → pas de boucle sur saveProfile.
    if (nouveaux.length || minChange) {
      saveProfile({ ...profile, badges, scoreMin: nouveauMin });
      if (nouveaux.length) setJustUnlocked(nouveaux);
    }
  }, [profile?.user_id, score, (diagnostics || []).length, streak.record, streak.actuel, completed.creation, completed.regarnissage]); // eslint-disable-line

  const badges = BADGES.map(b => ({
    ...b,
    unlocked:   !!(profile?.badges && profile.badges[b.id]),
    unlockedAt: profile?.badges?.[b.id]?.at || null,
  }));
  const nbUnlocked = badges.filter(b => b.unlocked).length;

  return {
    badges,
    nbUnlocked,
    total: BADGES.length,
    justUnlocked,
    clearJustUnlocked: () => setJustUnlocked([]),
  };
}
