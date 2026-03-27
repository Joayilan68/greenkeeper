// src/lib/useClassement.js
// Classement Duolingo-style — Ligues hebdomadaires
// Actif uniquement Février → Octobre
// 100% localStorage — zéro API — zéro latence

import { useState, useEffect, useCallback } from "react";
import { useSaison } from "./useSaison";

const KEY = "gk_classement";

// ── Définition des ligues ────────────────────────────────────────────────────
export const LIGUES = [
  {
    id: "semis",
    label: "Semis",
    icone: "🌱",
    couleur: "#81c784",
    couleurBg: "#e8f5e9",
    description: "Bienvenue dans le classement !",
    taille: 30,
  },
  {
    id: "pousse",
    label: "Pousse",
    icone: "🌿",
    couleur: "#43a047",
    couleurBg: "#c8e6c9",
    description: "Tu progresses bien !",
    taille: 30,
  },
  {
    id: "gazon",
    label: "Gazon",
    icone: "🌳",
    couleur: "#2e7d32",
    couleurBg: "#a5d6a7",
    description: "Le niveau des vrais jardiniers !",
    taille: 25,
  },
  {
    id: "champion",
    label: "Champion",
    icone: "🏆",
    couleur: "#f9a825",
    couleurBg: "#fff9c4",
    description: "L'élite du gazon !",
    taille: 20,
  },
  {
    id: "legende",
    label: "Légende",
    icone: "💎",
    couleur: "#7b1fa2",
    couleurBg: "#f3e5f5",
    description: "Le sommet absolu !",
    taille: 10,
  },
];

// ── Joueurs simulés pour rendre le classement vivant ─────────────────────────
// En prod ces données viendraient de Supabase
// En attendant on simule des voisins réalistes
const PRENOMS = [
  "Thomas", "Lucas", "Emma", "Léa", "Nicolas", "Julie",
  "Maxime", "Sophie", "Pierre", "Marie", "Antoine", "Laura",
  "Julien", "Camille", "François", "Céline", "David", "Isabelle",
  "Romain", "Nathalie", "Florent", "Aurélie", "Sébastien", "Virginie",
  "Christophe", "Sandrine", "Guillaume", "Valérie", "Alexandre", "Stéphanie",
];

function genererJoueurs(ligueId, scoreUser, seed) {
  const ligue = LIGUES.find(l => l.id === ligueId);
  if (!ligue) return [];

  const taille = ligue.taille - 1; // -1 car on ajoute l'user
  const joueurs = [];

  // Générateur pseudo-aléatoire déterministe (même seed = mêmes joueurs toute la semaine)
  let r = seed;
  const rand = () => { r = (r * 1664525 + 1013904223) & 0xffffffff; return Math.abs(r) / 0xffffffff; };

  for (let i = 0; i < taille; i++) {
    const prenom = PRENOMS[Math.floor(rand() * PRENOMS.length)];
    // Scores répartis autour du score de l'user
    const ecart = Math.floor(rand() * 200) - 100;
    const score = Math.max(0, scoreUser + ecart);
    joueurs.push({ id: `bot_${i}`, prenom, score, isUser: false });
  }

  return joueurs;
}

// ── State par défaut ─────────────────────────────────────────────────────────
function defaultState() {
  return {
    ligueActuelle: "semis",
    pointsSemaine: 0,        // points accumulés cette semaine
    pointsSaisonTotal: 0,    // total depuis début de saison
    classementSauvegarde: null, // classement final sauvegardé en fin de saison
    historique_ligues: [],   // ligues passées
    seed_semaine: Date.now(), // seed pour joueurs simulés — change chaque semaine
    derniere_semaine: null,   // timestamp du dernier reset
    meilleur_classement: null, // meilleure position atteinte
  };
}

function getState() {
  try { return JSON.parse(localStorage.getItem(KEY)) || defaultState(); }
  catch { return defaultState(); }
}

function saveState(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

// Timestamp du lundi de la semaine courante
function debutSemaineActuelle() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const jour = d.getDay(); // 0=dim, 1=lun...
  d.setDate(d.getDate() - (jour === 0 ? 6 : jour - 1));
  return d.getTime();
}

// ── Hook principal ────────────────────────────────────────────────────────────
export function useClassement() {
  const { classementActif, isActif, mois } = useSaison();
  const [state, setState] = useState(() => getState());

  // Reset hebdomadaire — chaque lundi
  useEffect(() => {
    if (!classementActif) return;

    const current = getState();
    const debutSemaine = debutSemaineActuelle();

    if (!current.derniere_semaine || current.derniere_semaine < debutSemaine) {
      // Nouvelle semaine — reset des points hebdo et montée/descente de ligue
      const nouvellePosition = calculerPositionFinale(current);
      const nouvelleLigue    = calculerMouvementLigue(current.ligueActuelle, nouvellePosition, current.pointsSemaine);

      const newState = {
        ...current,
        pointsSemaine:    0,
        ligueActuelle:    nouvelleLigue,
        derniere_semaine: debutSemaine,
        seed_semaine:     debutSemaine, // nouvelle seed = nouveaux joueurs
        historique_ligues: [
          ...current.historique_ligues,
          { ligue: current.ligueActuelle, points: current.pointsSemaine, date: Date.now() }
        ].slice(-20),
      };

      saveState(newState);
      setState(newState);
    }
  }, []); // eslint-disable-line

  // Calcule la position finale de l'user dans le classement
  function calculerPositionFinale(s) {
    const joueurs = genererJoueurs(s.ligueActuelle, s.pointsSemaine, s.seed_semaine);
    const tousJoueurs = [...joueurs, { id: "user", score: s.pointsSemaine, isUser: true }]
      .sort((a, b) => b.score - a.score);
    return tousJoueurs.findIndex(j => j.isUser) + 1;
  }

  // Détermine la nouvelle ligue selon la position
  function calculerMouvementLigue(ligueId, position, points) {
    const idx = LIGUES.findIndex(l => l.id === ligueId);
    const ligue = LIGUES[idx];

    if (!ligue || points === 0) return ligueId; // pas de mouvement si 0 points

    const taille = ligue.taille;
    const top30pct = Math.ceil(taille * 0.3);
    const bot30pct = Math.floor(taille * 0.7);

    if (position <= top30pct && idx < LIGUES.length - 1) {
      // Promotion !
      return LIGUES[idx + 1].id;
    } else if (position > bot30pct && idx > 0) {
      // Rétrogradation
      return LIGUES[idx - 1].id;
    }
    return ligueId; // maintien
  }

  // Ajouter des points au classement de la semaine
  const ajouterPoints = useCallback((points) => {
    if (!classementActif) return;

    const current = getState();
    const newPoints = current.pointsSemaine + points;

    // Mise à jour meilleur classement
    const joueurs = genererJoueurs(current.ligueActuelle, newPoints, current.seed_semaine);
    const tousJoueurs = [...joueurs, { id: "user", score: newPoints, isUser: true }]
      .sort((a, b) => b.score - a.score);
    const position = tousJoueurs.findIndex(j => j.isUser) + 1;

    const meilleur = (!current.meilleur_classement || position < current.meilleur_classement)
      ? position
      : current.meilleur_classement;

    const newState = {
      ...current,
      pointsSemaine:      newPoints,
      pointsSaisonTotal:  current.pointsSaisonTotal + points,
      meilleur_classement: meilleur,
    };

    saveState(newState);
    setState(newState);
  }, [classementActif]);

  // Sauvegarder le classement final en fin de saison (novembre)
  const sauvegarderFinSaison = useCallback(() => {
    const current = getState();
    const newState = {
      ...current,
      classementSauvegarde: {
        ligue:    current.ligueActuelle,
        points:   current.pointsSaisonTotal,
        meilleur: current.meilleur_classement,
        date:     Date.now(),
      },
      pointsSemaine:     0,
      pointsSaisonTotal: 0,
    };
    saveState(newState);
    setState(newState);
  }, []);

  // Classement complet de la semaine
  const ligueActuelle = LIGUES.find(l => l.id === state.ligueActuelle) || LIGUES[0];
  const joueurs       = genererJoueurs(state.ligueActuelle, state.pointsSemaine, state.seed_semaine);
  const tousJoueurs   = [...joueurs, {
    id: "user",
    prenom: "Vous",
    score: state.pointsSemaine,
    isUser: true,
  }].sort((a, b) => b.score - a.score);

  const positionUser = tousJoueurs.findIndex(j => j.isUser) + 1;
  const totalJoueurs = tousJoueurs.length;

  // Zone promotion/rétrogradation
  const top30pct = Math.ceil(totalJoueurs * 0.3);
  const bot30pct = Math.floor(totalJoueurs * 0.7);
  const enZonePromotion     = positionUser <= top30pct;
  const enZoneRetrogradation = positionUser > bot30pct;

  // Jours restants dans la semaine
  const maintenant = new Date();
  const lundi      = new Date(debutSemaineActuelle());
  const dimanche   = new Date(lundi.getTime() + 6 * 86400000);
  dimanche.setHours(23, 59, 59);
  const joursRestants = Math.ceil((dimanche - maintenant) / 86400000);

  return {
    // Données ligue
    ligueActuelle,
    ligues: LIGUES,
    classementActif,

    // Classement de la semaine
    classement:   tousJoueurs,
    position:     positionUser,
    totalJoueurs,
    pointsSemaine: state.pointsSemaine,
    pointsSaison:  state.pointsSaisonTotal,

    // Zones
    enZonePromotion,
    enZoneRetrogradation,
    joursRestants,

    // Historique
    meilleurClassement:    state.meilleur_classement,
    classementSauvegarde:  state.classementSauvegarde,
    historiqueLigues:      state.historique_ligues,

    // Actions
    ajouterPoints,
    sauvegarderFinSaison,

    // Message contextuel
    messageClassement: !classementActif
      ? "😴 Classement en pause — reprend en février !"
      : enZonePromotion
        ? `🚀 Tu es en zone de promotion ! ${joursRestants} jour${joursRestants > 1 ? "s" : ""} restant${joursRestants > 1 ? "s" : ""}`
        : enZoneRetrogradation
          ? `⚠️ Tu es en zone de rétrogradation — remonte vite !`
          : `📊 Tu es ${positionUser}ème sur ${totalJoueurs} — continue !`,
  };
}
