// src/lib/planEntretien.js
// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE UNIQUE DE VÉRITÉ — Toutes les recommandations d'entretien Mongazon360
// Aligné sur la matrice Excel v4 "Zones x Mois"
// Importé par Today.jsx (journaliser) ET MyLawn.jsx (plan du mois)
// → cohérence parfaite garantie entre les deux pages
// ═══════════════════════════════════════════════════════════════════════════════

import { MONTHLY_PLAN } from "./lawn";

// ── Zone climatique (GPS → zone) ──────────────────────────────────────────────
// Identique à useRecommandations.js — centralisé ici comme référence unique
export function zoneClimatique(profile) {
  // 1. Coordonnées depuis le profil (vérifiées par useProfile)
  let lat = profile?.lat;
  let lon = profile?.lon;

  // 2. Fallback : coordonnées GPS brutes depuis localStorage
  if (!lat || !lon) {
    try {
      const loc = JSON.parse(localStorage.getItem("gk_location"));
      if (loc?.lat && loc?.lon) { lat = loc.lat; lon = loc.lon; }
    } catch {}
  }
  if (!lat || !lon) return "centre"; // défaut sans GPS

  // Corse
  if (lat >= 41.3 && lat <= 43.1 && lon >= 8.5 && lon <= 9.6) return "corse";
  // Sud méditerranéen (Provence, Languedoc, PACA)
  if (lat < 44.5 && lon > 2)  return "sud";
  // Sud-Ouest (Occitanie, Nouvelle-Aquitaine sud)
  if (lat < 44.5 && lon <= 2) return "sud_ouest";
  // Nord (Nord-Pas-de-Calais)
  if (lat > 50) return "nord";
  // Nord-Est continental (Alsace, Lorraine, Champagne)
  if (lon > 5 && lat >= 46.5 && lat <= 50) return "nord_est";
  // Ouest océanique (Bretagne, Normandie, Pays de Loire)
  if (lon < 0 || (lon < 1.5 && lat > 46)) return "ouest";
  return "centre";
}

// ── Label zone pour affichage ─────────────────────────────────────────────────
export const ZONE_LABELS = {
  nord_est:  "Nord-Est",
  sud:       "Sud",
  sud_ouest: "Sud-Ouest",
  ouest:     "Ouest",
  nord:      "Nord",
  centre:    "Centre",
  corse:     "Corse",
};

// ── Helpers météo ─────────────────────────────────────────────────────────────
const gelPossible = (w) => w?.temp_min !== undefined && w.temp_min < 4;
const tropFroid   = (w, s = 10) => w?.temp_max !== undefined && w.temp_max < s;
const pluiePrevue = (w, s = 5)  => w?.precip   !== undefined && w.precip > s;
const solDetrempé = (w) => w?.precip !== undefined && w.precip > 15;
const ventFort    = (w) => w?.wind   !== undefined && w.wind >= 40;

// ── Helpers historique ────────────────────────────────────────────────────────
export function daysSince(history, keywords) {
  if (!history?.length) return 999;
  const matches = history.filter(h =>
    keywords.some(kw => h.action?.toLowerCase().includes(kw.toLowerCase()))
  );
  if (!matches.length) return 999;
  const ref = new Date(); ref.setHours(0, 0, 0, 0);
  const days = matches.map(h => {
    const parts = h.date?.split("/");
    if (!parts || parts.length !== 3) return 999;
    const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    return Math.floor((ref - d) / 86400000);
  });
  return Math.min(...days);
}

// ══════════════════════════════════════════════════════════════════════════════
// DÉFINITION DES 13 ACTIONS
// Alignées sur la matrice Excel v4 "Zones x Mois"
// ══════════════════════════════════════════════════════════════════════════════

export const ACTIONS_PLAN = [

  // ── 1. TONTE ✂️ ──────────────────────────────────────────────────────────
  {
    id:    "tonte",
    label: "Tonte ✂️",
    gp:    "tonte",
    // Mars → Novembre. Fév inclus en zone Sud/SO/Corse si repousse.
    getMois: (zone, sol, isSynth) => {
      if (isSynth) return [];
      const base = [3,4,5,6,7,8,9,10,11];
      return (zone === "sud" || zone === "sud_ouest" || zone === "corse")
        ? [2, ...base] : base;
    },
    // Intervalle : printemps=5j, été=4j, automne=7j
    getInterval: (month) => month >= 6 && month <= 8 ? 4 : month >= 3 && month <= 5 ? 5 : 7,
    getBlocked: (w) => {
      if (ventFort(w))                    return { blocked: true, raison: "Vents forts (≥40km/h) — reporter" };
      if (w?.temp_min !== undefined && w.temp_min <= 0) return { blocked: true, raison: "Gel — ne pas tondre le gazon gelé" };
      return { blocked: false };
    },
    keywords:     ["tonte"],
    detail:       (plan) => plan?.tonte || "Hauteur adaptée à la saison",
    needsProduct: false,
    exclusive:    [],
  },

  // ── 2. ARROSAGE 💧 ────────────────────────────────────────────────────────
  {
    id:    "arrosage",
    label: "Arrosage 💧",
    gp:    "arrosage",
    // Zone Sud/SO/Corse : dès février (~65x/an). Autres : mars-octobre (~50x/an)
    getMois: (zone, sol, isSynth) => {
      if (isSynth) return [];
      const base = [3,4,5,6,7,8,9,10];
      return (zone === "sud" || zone === "sud_ouest" || zone === "corse")
        ? [2, ...base] : base;
    },
    // Intervalle = floor(7 / fréquence_mensuelle) jours
    getInterval: (month) => {
      const freq = MONTHLY_PLAN[month]?.arrosage_freq || 2;
      return Math.max(1, Math.floor(7 / freq));
    },
    getBlocked: (w) => {
      if (w?.precip >= 10) return { blocked: true, raison: "Forte pluie — arrosage inutile aujourd'hui" };
      return { blocked: false };
    },
    keywords:      ["arrosage"],
    detail:        (plan, arros, profile, month, zone) => arros
      ? `${arros.freq}x/sem · ${arros.mm}mm/session · ${arros.minutes}min · Précipitations déduites`
      : `${MONTHLY_PLAN[month]?.arrosage_freq || 2}x/semaine recommandé`,
    weatherDriven: true, // délégué à calcArrosage — s'affiche seulement si arros !== null
    needsProduct:  false,
    exclusive:     [],
  },

  // ── 3. ENGRAIS STARTER 🌱 ─────────────────────────────────────────────────
  // Fenêtre : fév-mars. Zone Nord-Est/Nord : mars uniquement (sol trop froid en fév)
  {
    id:    "engrais_starter",
    label: "Engrais Starter 🌱",
    gp:    "engrais",
    getMois: (zone, sol, isSynth) => {
      if (isSynth) return [];
      return (zone === "nord_est" || zone === "nord") ? [3] : [2, 3];
    },
    getInterval: () => 45,
    getBlocked: (w, profile, zone) => {
      if (gelPossible(w))   return { blocked: true, raison: "Gel possible — engrais brûlerait le gazon" };
      if (tropFroid(w, 8))  return { blocked: true, raison: "Trop froid (<8°C) — engrais inefficace" };
      if ((zone === "nord_est" || zone === "nord") && tropFroid(w, 10))
        return { blocked: true, raison: "Zone Nord : tmax requis ≥10°C pour activer le NPK" };
      return { blocked: false };
    },
    keywords:     ["engrais starter", "engrais 🌱", "engrais"],
    detail:       (plan) => MONTHLY_PLAN[3]?.engrais || "NPK 12-5-5 organo-minéral · 30-40 g/m²",
    needsProduct: true,
    exclusive:    [],
    maxParAn:     2,
  },

  // ── 4. ENGRAIS ÉTÉ ☀️ ────────────────────────────────────────────────────
  // Mai-juin avant la chaleur estivale
  {
    id:    "engrais_ete",
    label: "Engrais Été ☀️",
    gp:    "engrais",
    getMois: (zone, sol, isSynth) => isSynth ? [] : [5, 6],
    getInterval: () => 45,
    getBlocked: (w) => {
      if (solDetrempé(w)) return { blocked: true, raison: "Sol détrempé (>15mm) — lessivage immédiat" };
      return { blocked: false };
    },
    keywords:     ["engrais été", "engrais ☀️", "engrais"],
    detail:       (plan) => plan?.engrais || "NPK 15-5-10 longue durée · 30 g/m²",
    needsProduct: true,
    exclusive:    [],
    maxParAn:     1,
  },

  // ── 5. ENGRAIS AUTOMNE 🍂 ─────────────────────────────────────────────────
  // Septembre-octobre. Riche en potassium pour préparer l'hiver
  {
    id:    "engrais_automne",
    label: "Engrais Automne 🍂",
    gp:    "engrais",
    getMois: (zone, sol, isSynth) => isSynth ? [] : [9, 10],
    getInterval: () => 45,
    getBlocked: (w) => {
      if (gelPossible(w)) return { blocked: true, raison: "Gel possible — engrais non absorbé" };
      if (solDetrempé(w)) return { blocked: true, raison: "Sol détrempé — lessivage" };
      return { blocked: false };
    },
    keywords:     ["engrais automne", "engrais 🍂", "engrais"],
    detail:       (plan) => plan?.engrais || "NPK 5-10-25 automne · 40 g/m²",
    needsProduct: true,
    exclusive:    [],
    maxParAn:     1,
  },

  // ── 6. ENGRAIS HIVER ❄️ ──────────────────────────────────────────────────
  // Novembre uniquement — potassium résistance gel
  {
    id:    "engrais_hiver",
    label: "Engrais Hiver ❄️",
    gp:    "engrais",
    getMois: (zone, sol, isSynth) => isSynth ? [] : [11],
    getInterval: () => 45,
    getBlocked: () => ({ blocked: false }),
    keywords:     ["engrais hiver", "engrais ❄️", "chaux", "engrais"],
    detail:       (plan) => MONTHLY_PLAN[11]?.engrais || "Chaux magnésienne si pH<6 · 150-200 g/m²",
    needsProduct: true,
    exclusive:    [],
    maxParAn:     1,
  },

  // ── 7. VERTICUT 🔧 ────────────────────────────────────────────────────────
  // Avr-Mai-Juin (verticut:true dans MONTHLY_PLAN)
  // ⚠️ MUTUELLEMENT EXCLUSIF avec Aération (l'un OU l'autre)
  {
    id:    "verticut",
    label: "Verticut 🔧",
    gp:    "scarification",
    getMois: (zone, sol, isSynth) => {
      if (isSynth) return [];
      // Dérivé de MONTHLY_PLAN — même source que MyLawn
      return Object.entries(MONTHLY_PLAN).filter(([,p]) => p.verticut).map(([m]) => +m);
    },
    getInterval: () => 180,
    getBlocked: (w) => {
      if (pluiePrevue(w, 3)) return { blocked: true, raison: "Pluie prévue — reporter" };
      if (tropFroid(w, 10))  return { blocked: true, raison: "Trop froid — gazon en dormance" };
      return { blocked: false };
    },
    keywords:       ["verticut", "scarif"],
    detail:         () => "Scarification / passage verticut",
    needsProduct:   false,
    exclusive:      ["aeration"],   // ⚠️ ne pas faire le même jour que l'aération
    exclusiveDelai: 30,
    maxParAn:       2,
  },

  // ── 8. AÉRATION 🌀 ───────────────────────────────────────────────────────
  // Base : mars + septembre
  // Sol argileux/compacté : + avril et octobre (extension agronomique)
  // ⚠️ MUTUELLEMENT EXCLUSIVE avec Scarification et Verticut
  {
    id:    "aeration",
    label: "Aération 🌀",
    gp:    "aeration",
    getMois: (zone, sol, isSynth) => {
      if (isSynth) return [];
      const base = [3, 9];
      return (sol === "argileux" || sol === "compacte")
        ? [3, 4, 9, 10] : base;
    },
    getInterval: () => 90,
    getBlocked: (w) => {
      if (solDetrempé(w)) return { blocked: true, raison: "Sol détrempé — attendre que ça sèche" };
      return { blocked: false };
    },
    keywords:       ["aeration", "aération", "carottage"],
    detail:         (plan, arros, profile) => {
      const sol = profile?.sol;
      return (sol === "argileux" || sol === "compacte")
        ? "Aération recommandée — sol compacté (étendue avr+oct)"
        : "Aération ou carottage — améliore pénétration eau+engrais";
    },
    needsProduct:   false,
    exclusive:      ["verticut", "scarification"],
    exclusiveDelai: 30,
    maxParAn:       2,
  },

  // ── 9. SCARIFICATION 🔩 ──────────────────────────────────────────────────
  // Mars, avril, septembre
  // ⚠️ MUTUELLEMENT EXCLUSIVE avec Aération
  {
    id:    "scarification",
    label: "Scarification 🔩",
    gp:    "scarification",
    getMois: (zone, sol, isSynth) => isSynth ? [] : [3, 4, 9],
    getInterval: () => 180,
    getBlocked: (w) => {
      if (pluiePrevue(w, 3)) return { blocked: true, raison: "Pluie prévue — reporter" };
      if (tropFroid(w, 10))  return { blocked: true, raison: "Trop froid (<10°C)" };
      return { blocked: false };
    },
    keywords:       ["scarif", "scarification"],
    detail:         () => "Élimine le feutre — améliore densité et absorption",
    needsProduct:   false,
    exclusive:      ["aeration"],
    exclusiveDelai: 30,
    maxParAn:       2,
  },

  // ── 10. DÉSHERBAGE 🪴 ─────────────────────────────────────────────────────
  // Avril + Mai : 1x/semaine (7j). Septembre : 2x/mois (14j)
  // Bloqué si pluie (lessivage) ou trop froid (inefficace)
  {
    id:    "desherbage",
    label: "Désherbage 🪴",
    gp:    "desherbage",
    getMois: (zone, sol, isSynth) => isSynth ? [] : [4, 5, 9],
    getInterval: (month) => month === 9 ? 14 : 7,
    getBlocked: (w) => {
      if (pluiePrevue(w, 3)) return { blocked: true, raison: "Pluie prévue — désherbant lessivé avant absorption" };
      if (tropFroid(w, 10))  return { blocked: true, raison: "Trop froid (<10°C) — désherbant inefficace" };
      return { blocked: false };
    },
    keywords:     ["desherb", "désherb"],
    detail:       (plan, arros, profile, month) =>
      month === 9 ? "Désherbant sélectif · 2x/mois en septembre"
                  : "Désherbant sélectif · 1x/semaine avr-mai",
    needsProduct: true,
    exclusive:    [],
    maxParAn:     14, // ~14 fois/an selon Excel
  },

  // ── 11. ANTI-MOUSSE 💊 ───────────────────────────────────────────────────
  // Mars, avril, septembre
  // Zone Ouest/Nord : seuil score abaissé à 75 (humidité chronique)
  // Condition d'activation : sol argileux, ombrage, humidité, score bas
  {
    id:    "antimousse",
    label: "Anti-mousse 💊",
    gp:    "anti_mousse",
    getMois: (zone, sol, isSynth) => isSynth ? [] : [3, 4, 9],
    getInterval: () => 30,
    getBlocked:  () => ({ blocked: false }),
    conditionActive: (profile, score, weather, zone) => {
      const seuil   = (zone === "ouest" || zone === "nord") ? 75 : 65;
      const humid   = weather?.humidity > 70 && weather?.temp_max < 18;
      return profile?.sol === "argileux"        ||
             profile?.sol === "compacte"         ||
             profile?.exposition === "ombrage"   ||
             profile?.exposition === "mi-ombre"  ||
             humid || score < seuil;
    },
    keywords:     ["anti_mousse", "anti-mousse", "mousse", "fongicide"],
    detail:       (plan, arros, profile, month, zone) => {
      const seuil = (zone === "ouest" || zone === "nord") ? 75 : 65;
      return `Traitement anti-mousse · seuil score <${seuil} en zone ${ZONE_LABELS[zone] || zone}`;
    },
    needsProduct: true,
    exclusive:    [],
    maxParAn:     3,
  },

  // ── 12. BIOSTIMULANT 🌿 ──────────────────────────────────────────────────
  // Mars à octobre · toutes les 6 semaines (42j min)
  // Seuil température : Sud/SO/Corse = 22°C · Autres zones = 25°C
  {
    id:    "biostimulant",
    label: "Biostimulant 🌿",
    gp:    "anti_mousse",
    getMois: (zone, sol, isSynth) => isSynth ? [] : [3,4,5,6,7,8,9,10],
    getInterval: () => 42,
    getBlocked:  () => ({ blocked: false }),
    conditionActive: (profile, score, weather, zone) => {
      const seuilTemp = (zone === "sud" || zone === "sud_ouest" || zone === "corse") ? 22 : 25;
      const chaud     = (weather?.temp_max || 0) >= seuilTemp;
      return chaud || score < 75;
    },
    keywords:     ["biostimulant", "biostimul"],
    detail:       (plan, arros, profile, month, zone) => {
      const t = (zone === "sud" || zone === "sud_ouest" || zone === "corse") ? 22 : 25;
      return `Toutes les 6 semaines · seuil chaleur ${t}°C en ${ZONE_LABELS[zone] || zone}`;
    },
    needsProduct: true,
    exclusive:    [],
    maxParAn:     6,
  },

  // ── 13. REGARNISSAGE 🌾 ──────────────────────────────────────────────────
  // Printemps (mars-mai) + fin été (août-sept)
  // Bloqué si trop chaud (>28°C) ou gel possible
  {
    id:    "regarnissage",
    label: "Regarnissage 🌾",
    gp:    "semences",
    getMois: (zone, sol, isSynth) => isSynth ? [] : [3, 4, 5, 8, 9],
    getInterval: () => 60,
    getBlocked: (w) => {
      if ((w?.temp_max || 0) > 28) return { blocked: true, raison: "Trop chaud (>28°C) — germination compromise" };
      if (gelPossible(w))          return { blocked: true, raison: "Gel possible — semences ne germent pas" };
      return { blocked: false };
    },
    keywords:     ["semences", "semis", "regarnissage"],
    detail:       (plan, arros, profile) => {
      const qty = profile?.surface
        ? `~${Math.round(profile.surface * 0.035 * 10) / 10}kg pour ${profile.surface}m²`
        : "Semences sur zones clairsemées";
      const type = profile?.pelouse === "ombre"  ? "mélange ombre/mi-ombre"
                 : profile?.pelouse === "sport"  ? "ray-grass résistant"
                 : profile?.pelouse === "sec"    ? "fétuque sécheresse"
                 : "mélange universel";
      return `${type} · ${qty}`;
    },
    needsProduct: true,
    exclusive:    [],
    maxParAn:     2,
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE — calcul du statut de chaque action
// Statuts : "recommended" | "done_today" | "too_soon" | "off_season"
//           | "blocked" | "exclusive"
// ══════════════════════════════════════════════════════════════════════════════
export function buildActions(profile, weather, history, score, month, arros) {
  const isSynth = profile?.isSynthetique || profile?.pelouse === "synthetique";
  const sol     = profile?.sol;
  const zone    = zoneClimatique(profile);
  const plan    = MONTHLY_PLAN[month];
  const sc      = score ?? 70; // score par défaut si non fourni

  return ACTIONS_PLAN.map(action => {
    const mois     = action.getMois(zone, sol, isSynth);
    const since    = daysSince(history, action.keywords);
    const interval = action.getInterval(month, zone, plan);

    // Données enrichies communes
    const base = { action, since, zone, plan };

    // ── 1. Hors saison ────────────────────────────────────────────────────
    if (!mois.includes(month)) {
      return { ...base, status: "off_season", daysLeft: null };
    }

    // ── 2. Arrosage piloté par météo ──────────────────────────────────────
    if (action.weatherDriven && !arros) {
      return { ...base, status: "off_season", daysLeft: null };
    }

    // ── 3. Condition d'activation optionnelle (anti-mousse, biostimulant) ─
    if (action.conditionActive) {
      const active = action.conditionActive(profile, sc, weather, zone);
      if (!active) {
        return { ...base, status: "off_season", daysLeft: null };
      }
    }

    // ── 4. Fait aujourd'hui ───────────────────────────────────────────────
    if (since === 0) {
      return { ...base, status: "done_today", daysLeft: 0 };
    }

    // ── 5. Trop récent (intervalle non écoulé) ────────────────────────────
    if (since < interval) {
      return { ...base, status: "too_soon", daysLeft: interval - since };
    }

    // ── 6. Exclusivité mutuelle ───────────────────────────────────────────
    if (action.exclusive?.length > 0) {
      for (const exId of action.exclusive) {
        const exAction = ACTIONS_PLAN.find(a => a.id === exId);
        if (!exAction) continue;
        const exSince = daysSince(history, exAction.keywords);
        const delai   = action.exclusiveDelai || 30;
        if (exSince <= delai) {
          return {
            ...base, status: "exclusive",
            daysLeft: delai - exSince,
            exclusiveWith: exAction.label,
          };
        }
      }
    }

    // ── 7. Blocage météo / profil ─────────────────────────────────────────
    const { blocked, raison } = action.getBlocked(weather || {}, profile, zone);
    if (blocked) {
      return { ...base, status: "blocked", daysLeft: null, blockedReason: raison };
    }

    // ── 8. ✅ Recommandé ───────────────────────────────────────────────────
    return { ...base, status: "recommended", daysLeft: null };
  });
}
