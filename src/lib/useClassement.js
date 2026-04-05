// src/lib/useClassement.js
// Classement Mongazon360 — Ligues MENSUELLES
// Score = (GreenPoints du mois × coeff profil) + jours de connexion
// 100% localStorage — zéro API — zéro latence

import { useState, useEffect, useCallback } from "react";
import { useSaison } from "./useSaison";

const KEY = "mg360_classement";

// ── Définition des ligues ────────────────────────────────────────────────────
export const LIGUES = [
  { id:"semis",    label:"Semis",    icone:"🌱", couleur:"#81c784", couleurBg:"#e8f5e9", description:"Bienvenue dans le classement !", taille:30, scoreRange:[10,150]  },
  { id:"pousse",   label:"Pousse",   icone:"🌿", couleur:"#43a047", couleurBg:"#c8e6c9", description:"Tu progresses bien !",           taille:30, scoreRange:[80,280]  },
  { id:"gazon",    label:"Gazon",    icone:"🌳", couleur:"#2e7d32", couleurBg:"#a5d6a7", description:"Le niveau des vrais jardiniers !",taille:25, scoreRange:[150,450] },
  { id:"champion", label:"Champion", icone:"🏆", couleur:"#f9a825", couleurBg:"#fff9c4", description:"L'élite du gazon !",             taille:20, scoreRange:[300,700] },
  { id:"legende",  label:"Légende",  icone:"💎", couleur:"#7b1fa2", couleurBg:"#f3e5f5", description:"Le sommet absolu !",             taille:10, scoreRange:[500,1200]},
];

const PRENOMS = ["Thomas","Lucas","Emma","Léa","Nicolas","Julie","Maxime","Sophie","Pierre","Marie","Antoine","Laura","Julien","Camille","François","Céline","David","Isabelle","Romain","Nathalie","Florent","Aurélie","Sébastien","Virginie","Christophe","Sandrine","Guillaume","Valérie","Alexandre","Stéphanie"];

// ── Coefficient de complétude profil ─────────────────────────────────────────
export function getCoeffProfil(completion) {
  return Math.min(1, Math.max(0.40, (completion || 40) / 100));
}

// ── Calcul score mensuel ──────────────────────────────────────────────────────
export function calcScoreMensuel(gpDuMois, completion, joursConnexion) {
  const coeff = getCoeffProfil(completion);
  return Math.round((gpDuMois * coeff) + joursConnexion);
}

// ── Générateur pseudo-aléatoire déterministe ─────────────────────────────────
function makeRand(seed) {
  let r = seed;
  return () => { r = (r * 1664525 + 1013904223) & 0xffffffff; return Math.abs(r) / 0xffffffff; };
}

// ── Génération des joueurs simulés (bots 🤖) ─────────────────────────────────
// Les bots complètent le classement pendant la phase de lancement.
// Ils seront retirés automatiquement lorsque la ligue aura 100+ utilisateurs
// réels actifs sur le mois — ce seuil sera géré côté backend (Supabase/Vercel KV)
// lors de la migration vers un backend persistant.
function genererJoueurs(ligueId, seed) {
  const ligue = LIGUES.find(l => l.id === ligueId);
  if (!ligue) return [];
  const rand = makeRand(seed);
  const [min, max] = ligue.scoreRange;
  const joueurs = [];
  for (let i = 0; i < ligue.taille - 1; i++) {
    const prenom    = PRENOMS[Math.floor(rand() * PRENOMS.length)];
    const score     = Math.max(0, Math.round(min + rand() * (max - min)));
    const isPaid    = rand() > 0.55;
    const createdAt = Date.now() - Math.floor(rand() * 365 * 86400000);
    joueurs.push({ id:`bot_${i}`, prenom, score, isUser:false, isBot:true, isPaid, createdAt });
  }
  return joueurs;
}

// ── Tri avec départage ────────────────────────────────────────────────────────
// 1. Score décroissant  2. Premium > Free  3. Plus ancien = priorité
function trierClassement(joueurs) {
  return [...joueurs].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (!!b.isPaid !== !!a.isPaid) return b.isPaid ? 1 : -1;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

// ── Helpers dates ─────────────────────────────────────────────────────────────
function debutMoisActuel() {
  const d = new Date(); d.setHours(0,0,0,0); d.setDate(1); return d.getTime();
}
function finMoisActuel() {
  const d = new Date(); d.setHours(23,59,59,999); d.setMonth(d.getMonth()+1,0); return d.getTime();
}
function joursRestantsMois() { return Math.ceil((finMoisActuel() - Date.now()) / 86400000); }
function dateJourKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }

function defaultState() {
  return {
    ligueActuelle:     "semis",
    connexionsDuMois:  [],
    historique_ligues: [],
    seed_mois:         debutMoisActuel(),
    dernier_mois:      null,
    meilleur_classement: null,
    createdAt:         Date.now(),
  };
}

function getState() {
  try { return { ...defaultState(), ...JSON.parse(localStorage.getItem(KEY)) }; }
  catch { return defaultState(); }
}
function saveState(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }

function calculerMouvementLigue(ligueId, position, total, score) {
  const idx = LIGUES.findIndex(l => l.id === ligueId);
  if (idx < 0 || score === 0) return ligueId;
  if (position <= Math.ceil(total * 0.50) && idx < LIGUES.length-1) return LIGUES[idx+1].id;
  if (position > Math.floor(total * 0.75) && idx > 0) return LIGUES[idx-1].id;
  return ligueId;
}

// ── Hook principal ────────────────────────────────────────────────────────────
export function useClassement(gpHistorique = [], profile = null, isPaid = false) {
  const { classementActif } = useSaison();
  const [state, setState] = useState(() => getState());

  // GreenPoints du mois courant
  const debutMois = debutMoisActuel();
  const gpDuMois  = gpHistorique.filter(h => h.date >= debutMois).reduce((s, h) => s + (h.points||0), 0);

  // Score utilisateur
  const completion     = profile?.profileCompletion || 40;
  const joursConnexion = (state.connexionsDuMois || []).length;
  const scoreUser      = calcScoreMensuel(gpDuMois, completion, joursConnexion);

  // Reset mensuel
  useEffect(() => {
    if (!classementActif) return;
    const current = getState();
    if (!current.dernier_mois || current.dernier_mois < debutMoisActuel()) {
      const bots = genererJoueurs(current.ligueActuelle, current.seed_mois);
      const tous = trierClassement([...bots, { id:"user", score:scoreUser, isUser:true, isPaid, createdAt:current.createdAt }]);
      const pos  = tous.findIndex(j => j.isUser) + 1;
      const nouvelleLigue = calculerMouvementLigue(current.ligueActuelle, pos, tous.length, scoreUser);

      const newState = {
        ...current,
        connexionsDuMois:  [],
        ligueActuelle:     nouvelleLigue,
        dernier_mois:      debutMoisActuel(),
        seed_mois:         debutMoisActuel(),
        historique_ligues: [...(current.historique_ligues||[]),
          { ligue:current.ligueActuelle, score:scoreUser, position:pos, date:Date.now() }
        ].slice(-24),
      };
      saveState(newState); setState(newState);
    }
  }, []); // eslint-disable-line

  // Enregistrer connexion du jour
  const enregistrerConnexionJour = useCallback(() => {
    const current = getState();
    const key = dateJourKey();
    const connexions = (current.connexionsDuMois || []);
    if (connexions.includes(key)) return;
    const newState = { ...current, connexionsDuMois: [...connexions, key] };
    saveState(newState); setState(newState);
  }, []);

  // Classement complet
  const ligueActuelle = LIGUES.find(l => l.id === state.ligueActuelle) || LIGUES[0];
  const bots          = genererJoueurs(state.ligueActuelle, state.seed_mois);
  const tousJoueurs   = trierClassement([
    ...bots,
    { id:"user", prenom:"Vous", score:scoreUser, isUser:true, isBot:false, isPaid, createdAt:state.createdAt },
  ]);

  const positionUser         = tousJoueurs.findIndex(j => j.isUser) + 1;
  const totalJoueurs         = tousJoueurs.length;
  const enZonePromotion      = positionUser <= Math.ceil(totalJoueurs * 0.50);
  const enZoneRetrogradation = positionUser > Math.floor(totalJoueurs * 0.75);
  const joursRestants        = joursRestantsMois();

  const messageClassement = !classementActif
    ? "😴 Classement en pause — reprend en février !"
    : enZonePromotion
      ? `🚀 Zone de promotion ! ${joursRestants} jour${joursRestants>1?"s":""} restant${joursRestants>1?"s":""}`
      : enZoneRetrogradation
        ? "⚠️ Zone de rétrogradation — remonte vite !"
        : `📊 ${positionUser}ème sur ${totalJoueurs} — continue !`;

  return {
    ligueActuelle, ligues:LIGUES, classementActif,
    classement:tousJoueurs, position:positionUser, totalJoueurs,
    scoreUser, gpDuMois, coeff:getCoeffProfil(completion), completion, joursConnexion,
    enZonePromotion, enZoneRetrogradation, joursRestants,
    meilleurClassement:state.meilleur_classement,
    historiqueLigues:state.historique_ligues || [],
    enregistrerConnexionJour,
    messageClassement,
  };
}
