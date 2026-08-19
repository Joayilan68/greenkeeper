// src/lib/useBadges.js
// ★★★ VERSION 2 — 10 badges ACTIFS (germination #7 + saisonniers #9/#10) — prend `history` ★★★
// Repere fiable : cette v2 contient "function germinationParfaite" et "saisonGagnee".
// ─────────────────────────────────────────────────────────────────────────────
// Badges collectionnables (RARES & MÉRITÉS) — repris de la KB "Badges & Objectifs".
// Symboliques (PAS de points bonus, les GreenPoints restent le système courant).
//
// Détection 100 % CLIENT, stockage dans profiles.data.badges (upsert via useProfile).
// AUCUNE modification serveur : parcours & saisons lus/écrits via le blob profile.
//
// Les 10 badges sont désormais tous détectés :
//   #7  germination_parfaite → 21 j d'arrosage sur la fenêtre de germination (scan history)
//   #9  champion_printemps   → saison mars→juin sans interruption (suivi profiles.data.saisons)
//   #10 maitre_automne       → saison août→nov  sans interruption (idem)
// Note millésime : #9/#10 sont forward-looking (une saison passée non tracée reste inaccessible).
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
  { id:"germination_parfaite", emoji:"💧", nom:"Germination parfaite",  categorie:"Régularité",      acces:"Gratuit", rarete:"Rare",            condition:"21 jours d'arrosage de germination sans en rater un seul",       felicitation:"21 jours d'arrosage sans faute : vos graines vous remercient 💧" },
  { id:"oeil_expert",          emoji:"📸", nom:"Œil expert",            categorie:"Maîtrise",        acces:"Premium", rarete:"Rare",            condition:"Réaliser 10 diagnostics photo IA",                               felicitation:"10 diagnostics : vous suivez votre gazon comme un pro 📸" },
  { id:"champion_printemps",   emoji:"🌸", nom:"Champion du Printemps", categorie:"Saisonnier",      acces:"Gratuit", rarete:"Édition limitée", condition:"Suivre une saison de printemps complète (mars→juin) sans interruption", felicitation:"Champion du Printemps ! Badge non reconductible 🌸" },
  { id:"maitre_automne",       emoji:"🍂", nom:"Maître de l'Automne",   categorie:"Saisonnier",      acces:"Gratuit", rarete:"Édition limitée", condition:"Suivre une saison d'automne complète (août→nov) sans interruption",     felicitation:"Maître de l'Automne ! Collectionnez les saisons 🍂" },
];

// ── Helpers date ──────────────────────────────────────────────────────────────
const DAY = 86400000;
function ymd(d) { return d.toISOString().slice(0, 10); }
// history : entrées { date:"JJ/MM/AAAA", action:"..." } → set des jours (YYYY-MM-DD) avec arrosage
function joursArrosage(history) {
  const set = new Set();
  (Array.isArray(history) ? history : []).forEach(h => {
    if (!h?.action || !h?.date) return;
    if (!String(h.action).toLowerCase().includes("arrosage")) return;
    const parts = String(h.date).split("/");
    if (parts.length !== 3) return;
    const d = new Date(parts[2], parts[1] - 1, parts[0]);
    if (!isNaN(d.getTime())) set.add(ymd(d));
  });
  return set;
}
// 21 jours de germination (date_semis +1 .. +21) tous couverts par un arrosage ?
function germinationParfaite(parcoursRows, history) {
  const jours = joursArrosage(history);
  for (const p of (parcoursRows || [])) {
    if (!p?.date_semis) continue;
    const j0 = new Date(p.date_semis);
    if (isNaN(j0.getTime())) continue;
    let complet = true;
    for (let d = 1; d <= 21; d++) {
      const jour = new Date(j0.getTime() + d * DAY);
      if (!jours.has(ymd(jour))) { complet = false; break; }
    }
    if (complet) return true;
  }
  return false;
}
// Fenêtres de saison pour une année
function fenetresSaison(year) {
  return [
    { kind: "printemps", start: new Date(year, 2, 1),  end: new Date(year, 5, 30, 23, 59, 59) }, // 1 mars → 30 juin
    { kind: "automne",   start: new Date(year, 7, 1),  end: new Date(year, 10, 30, 23, 59, 59) }, // 1 août → 30 nov
  ];
}
function longueurSaison(w) { return Math.round((w.end - w.start) / DAY) + 1; }

export function useBadges({ profile, saveProfile, score, diagnostics = [], streak = {}, history = [], isPaid = false }) {
  const { userId, isSignedIn } = useAuth();
  const [parcoursRows, setParcoursRows] = useState([]);
  const [justUnlocked, setJustUnlocked] = useState([]);

  // ── Parcours du user (type, date_semis, statut) — lecture seule ────────────
  useEffect(() => {
    if (!isSignedIn || !userId) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("parcours")
          .select("type, date_semis, statut")
          .eq("user_id", userId);
        setParcoursRows(data || []);
      } catch { /* pas bloquant */ }
    })();
  }, [isSignedIn, userId]);

  // ── Détection + persistance (idempotent, first-touch) ─────────────────────
  useEffect(() => {
    if (!profile) return;
    let changed = false;

    const dejaBadges = (profile.badges && typeof profile.badges === "object" && !Array.isArray(profile.badges))
      ? profile.badges : {};
    const badges = { ...dejaBadges };

    // scoreMin (mémoire du plus bas score → "Sauveteur")
    const scoreValide = typeof score === "number" && !isNaN(score);
    const ancienMin   = typeof profile.scoreMin === "number" ? profile.scoreMin : (scoreValide ? score : null);
    const nouveauMin  = (scoreValide && ancienMin != null) ? Math.min(ancienMin, score) : ancienMin;
    if (nouveauMin != null && nouveauMin !== ancienMin) changed = true;

    // ── Suivi de saison (#9/#10) : tick une fois par jour d'ouverture ────────
    const now = new Date();
    const saisons = (profile.saisons && typeof profile.saisons === "object" && !Array.isArray(profile.saisons))
      ? { ...profile.saisons } : {};
    const fenetres = fenetresSaison(now.getFullYear());
    const courante = fenetres.find(w => now >= w.start && now <= w.end);
    if (courante) {
      const key = `${courante.kind}_${now.getFullYear()}`;
      const todayKey = ymd(now);
      const s = saisons[key] || { debut: todayKey, dernier: null, jours: 0, brise: false };
      if (s.dernier !== todayKey) {
        if (s.dernier) {
          const gap = Math.round((new Date(todayKey) - new Date(s.dernier)) / DAY);
          if (gap > 1) s.brise = true;
        }
        s.jours += 1;
        s.dernier = todayKey;
        saisons[key] = s;
        changed = true;
      }
    }
    // Évaluation des saisons terminées (sans interruption + couverture ≥ 50%)
    function saisonGagnee(kind) {
      for (const [key, s] of Object.entries(saisons)) {
        if (!key.startsWith(kind + "_")) continue;
        const year = parseInt(key.split("_")[1], 10);
        const w = fenetresSaison(year).find(x => x.kind === kind);
        if (!w) continue;
        if (now <= w.end) continue;                       // saison pas encore finie
        if (s.brise) continue;                            // interruption détectée
        if ((s.jours || 0) >= 0.5 * longueurSaison(w)) return true;
      }
      return false;
    }

    // ── Conditions des 10 badges ────────────────────────────────────────────
    const nbDiag = Array.isArray(diagnostics) ? diagnostics.length : 0;
    const record = typeof streak.record === "number" ? streak.record
                 : (typeof streak.actuel === "number" ? streak.actuel : 0);
    const termine = (type) => (parcoursRows || []).some(p => p.statut === "termine" && p.type === type);

    const conditions = {
      createur_gazon:       termine("creation"),
      regarnissage_reussi:  termine("regarnissage"),
      sauveteur_pelouse:    nouveauMin != null && nouveauMin < 40 && scoreValide && score > 70,
      gazon_exception:      scoreValide && score > 90,
      assidu_30:            record >= 30,
      inebranlable_100:     record >= 100,
      germination_parfaite: germinationParfaite(parcoursRows, history),
      oeil_expert:          nbDiag >= 10,
      champion_printemps:   saisonGagnee("printemps"),
      maitre_automne:       saisonGagnee("automne"),
    };

    const nouveaux = [];
    for (const b of BADGES) {
      if (conditions[b.id] && !badges[b.id]) {
        badges[b.id] = { at: new Date().toISOString() };
        nouveaux.push(b);
        changed = true;
      }
    }

    // Déps volontairement sans `profile` (objet) → pas de boucle sur saveProfile.
    if (changed) {
      saveProfile({ ...profile, badges, scoreMin: nouveauMin, saisons });
      if (nouveaux.length) setJustUnlocked(nouveaux);
    }
  }, [profile?.user_id, score, (diagnostics || []).length, (history || []).length, streak.record, streak.actuel, parcoursRows]); // eslint-disable-line

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
