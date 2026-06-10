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

// ── Helpers type de gazon ─────────────────────────────────────────────────────
// Compatible multi-select (gazons[]) ET single-select (pelouse)
const isGazonOmbre    = (p) => p?.pelouse === "ombre" ||
  (Array.isArray(p?.gazons) && p.gazons.includes("ombre"));
const isGazonSport    = (p) => p?.pelouse === "sport" ||
  (Array.isArray(p?.gazons) && p.gazons.includes("sport"));
const isGazonRustique = (p) => p?.pelouse === "rustique" ||
  (Array.isArray(p?.gazons) && p.gazons.includes("rustique"));

// ── Helpers objectif profil ───────────────────────────────────────────────────
const isObjectifCreer   = (p) => p?.objectif === "creer";
const isObjectifRenover = (p) => p?.objectif === "renover";
const isObjectifNaturel = (p) => p?.objectif === "naturel";

// ── Jours depuis début de programme Rénover/Créer ────────────────────────────
// Stocké dans profiles.data.date_debut_programme (ISO string)
// Retourne null si pas de programme actif
export function joursProgramme(profile) {
  const debut = profile?.date_debut_programme;
  if (!debut) return null;
  try {
    const d = new Date(debut);
    if (isNaN(d.getTime())) return null;
    const now = new Date(); now.setHours(0,0,0,0);
    return Math.floor((now - d) / 86400000);
  } catch { return null; }
}

// Vérifie si on est dans la fenêtre de restriction du programme
// ex: estDansProgramme(profile, 60) → true si J0-J60
export function estDansProgramme(profile, maxJours) {
  if (!isObjectifCreer(profile) && !isObjectifRenover(profile)) return false;
  const j = joursProgramme(profile);
  if (j === null) return false; // pas de date_debut = on ne bloque pas
  return j <= maxJours;
}

// ── Alertes maladies fongiques ────────────────────────────────────────────────
// Retourne la maladie détectée ou null selon les conditions météo
export function detecterMaladie(weather, profile, month) {
  if (!weather) return null;
  const { temp_min, temp_max, humidity, precip } = weather;
  const isOmbre = isGazonOmbre(profile);
  const isSport = isGazonSport(profile);

  // Fusariose : gel/froid + humidité élevée 48h
  if (temp_min < 5 && (humidity || 0) > 85 && [10,11,2,3,4].includes(month))
    return { id: "fusariose", label: "Risque Fusariose", urgence: "haute",
      message: "Températures basses + humidité élevée : conditions idéales pour la fusariose. Traitement préventif recommandé.",
      traitement: "Fongicide préventif (iprodione ou thirame)" };

  // Pythium : chaleur + pluie nocturne
  if ((temp_max || 0) > 30 && (precip || 0) > 3 && [6,7,8].includes(month))
    return { id: "pythium", label: "Risque Pythium ⚠️", urgence: "haute",
      message: "Chaleur extrême + pluie récente : risque Pythium élevé (taches grasses gris-vert). Agir sous 24h.",
      traitement: "Fongicide spécifique (métalaxyl). Éviter arrosage soir." };

  // Oïdium : ombrage + conditions douces
  if (isOmbre && (temp_max || 0) >= 18 && (temp_max || 0) <= 24 && (humidity || 0) >= 70 && [4,5,9,10].includes(month))
    return { id: "oidium", label: "Risque Oïdium", urgence: "normale",
      message: "Gazon ombre + conditions douces : surveillez l'apparition de poudre blanche sur les brins.",
      traitement: "Soufre micronisé (bio) ou fongicide soufre" };

  // Helminthosporiose : stress hydrique + chaleur (sport surtout)
  if (isSport && (temp_max || 0) > 25 && (precip || 0) < 2 && [5,6,7,8,9].includes(month))
    return { id: "helmintho", label: "Risque Helminthosporiose", urgence: "normale",
      message: "Chaleur + sécheresse sur gazon sport : taches brun-noir possibles. Arrosez tôt le matin.",
      traitement: "Engrais équilibré + arrosage matinal régulier" };

  return null;
}

// ── Helpers historique ────────────────────────────────────────────────────────
export function daysSince(history, keywords) {
  if (!history?.length) return 999;
  if (!Array.isArray(keywords) || !keywords.length) return 999;
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
    getMois: (zone, sol, isSynth, profile) => {
      const base = [3,4,5,6,7,8,9,10,11];
      return (zone === "sud" || zone === "sud_ouest" || zone === "corse")
        ? [2, ...base] : base;
    },
    // Intervalle : printemps=5j, été=4j, automne=7j
    getInterval: (month) => month >= 6 && month <= 8 ? 4 : month >= 3 && month <= 5 ? 5 : 7,
    getBlocked: (w, profile) => {
      if (isObjectifCreer(profile) && estDansProgramme(profile, 30))
        return { blocked: true, raison: "Création J0-J30 : attendre 8-10cm avant première tonte" };
      if (pluiePrevue(w, 5)) return { blocked: true, raison: "Pluie prévue (>5mm) — gazon glissant, risque fongique" };
      if (ventFort(w))       return { blocked: true, raison: "Vents forts (≥40km/h) — reporter" };
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
    getMois: (zone, sol, isSynth, profile) => {
      const base = [3,4,5,6,7,8,9,10];
      return (zone === "sud" || zone === "sud_ouest" || zone === "corse")
        ? [2, ...base] : base;
    },
    // Intervalle = floor(7 / fréquence_mensuelle) jours
    getInterval: (month) => {
      const freq = MONTHLY_PLAN[month]?.arrosage_freq || 2;
      return Math.max(1, Math.floor(7 / freq));
    },
    getBlocked: (w, profile) => {
      if (w?.precip >= 10) return { blocked: true, raison: "Forte pluie — arrosage inutile aujourd'hui" };
      if (w?.precip >= 8)  return { blocked: true, raison: `Pluie ${w.precip}mm ≥ 8mm — arrosage inutile aujourd'hui` };
      return { blocked: false };
    },
    // Arrosage quotidien J0-J60 pour Créer (géré dans detail et Today.jsx)
    getArrosageMode: (profile) => {
      if (isObjectifCreer(profile) && estDansProgramme(profile, 60)) return "quotidien";
      if (isObjectifCreer(profile) && estDansProgramme(profile, 90)) return "intensif"; // J61-J90
      if (isObjectifRenover(profile) && estDansProgramme(profile, 30)) return "intensif"; // J0-J30
      return "standard";
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
    getMois: (zone, sol, isSynth, profile) => {
      return (zone === "nord_est" || zone === "nord") ? [3] : [2, 3];
    },
    getInterval: () => 45,
    getBlocked: (w, profile, zone) => {
      if (isObjectifNaturel(profile)) return { blocked: true, raison: "Objectif Naturel — utilisez un engrais organique (farine de corne, guano)" };
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
    getMois: (zone, sol, isSynth, profile) => {
      return [5, 6];
    },
    getInterval: () => 45,
    getBlocked: (w, profile) => {
      if (isObjectifNaturel(profile)) return { blocked: true, raison: "Objectif Naturel — utilisez un engrais organique d'été (algues marines, acides humiques)", alternative: "organique" };
      if (isObjectifCreer(profile) && estDansProgramme(profile, 60))
        return { blocked: true, raison: `Création J0-J60 : engrais été bloqué (gazon en germination)` };
      if (isObjectifRenover(profile) && estDansProgramme(profile, 60))
        return { blocked: true, raison: `Rénovation J0-J60 : engrais été bloqué` };
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
    getMois: (zone, sol, isSynth, profile) => {
      return [9, 10];
    },
    getInterval: () => 45,
    getBlocked: (w, profile) => {
      if (isObjectifNaturel(profile)) return { blocked: true, raison: "Objectif Naturel — utilisez un engrais organique d'automne" };
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
    getMois: (zone, sol, isSynth, profile) => {
      return [11];
    },
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
    gp:    "verticut",
    getMois: (zone, sol, isSynth, profile) => {
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
    getMois: (zone, sol, isSynth, profile) => {
      const base = [3, 9];
      return (sol === "argileux" || sol === "compacte")
        ? [3, 4, 9, 10] : base;
    },
    getInterval: () => 90,
    getBlocked: (w, profile) => {
      if (isObjectifCreer(profile) && estDansProgramme(profile, 90))
        return { blocked: true, raison: "Création J0-J90 : gazon pas encore établi" };
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
    getMois: (zone, sol, isSynth, profile) => {
      if (isGazonOmbre(profile)) return []; // Ombre : scarification déconseillée
      return [3, 4, 9];
    },
    getInterval: () => 180,
    getBlocked: (w, profile) => {
      if (isObjectifCreer(profile) && estDansProgramme(profile, 90))
        return { blocked: true, raison: "Création J0-J90 : gazon pas encore établi" };
      if (pluiePrevue(w, 3)) return { blocked: true, raison: "Pluie prévue — reporter" };
      if (tropFroid(w, 10))  return { blocked: true, raison: "Trop froid (<10°C)" };
      return { blocked: false };
    },
    detail:         () => "Élimine le feutre — améliore densité et absorption",
    keywords:       ["scarif", "scarification"],
    needsProduct:   false,
    exclusive:      ["aeration"],
    exclusiveDelai: 30,
    maxParAn:       2,
  },

  // ── 10. DÉSHERBAGE 🪴 ─────────────────────────────────────────────────────
  // Avr→Oct : 1x/semaine (7j). Sept-Oct : 2x/mois (14j)
  // Bloqué si pluie (lessivage) ou trop froid (inefficace)
  // Objectif Naturel : désherbage MANUEL autorisé (pas de chimique)
  {
    id:    "desherbage",
    label: "Désherbage 🪴",
    gp:    "desherbage",
    getMois: (zone, sol, isSynth, profile) => {
      if (isGazonRustique(profile)) return []; // Rustique : trèfle protégé — toujours bloqué
      // Naturel + Créer + Rénover : toujours inclus dans les mois (blocage géré dans getBlocked)
      return [4, 5, 6, 7, 8, 9, 10];
    },
    getInterval: (month) => (month === 9 || month === 10) ? 14 : 7,
    getBlocked: (w, profile) => {
      // Objectif Naturel → désherbage manuel autorisé, pas de blocage
      // L'action passe en "recommended" avec flag isManuel pour adapter le label
      if (isObjectifNaturel(profile))
        return { blocked: false, isManuel: true };
      // Programme Créer : désherbant bloqué J0-J45
      if (isObjectifCreer(profile) && estDansProgramme(profile, 45))
        return { blocked: true, raison: `Création J0-J45 : désherbant bloqué (gazon trop jeune)` };
      // Programme Rénover : désherbant total bloqué J0-J30
      if (isObjectifRenover(profile) && estDansProgramme(profile, 30))
        return { blocked: true, raison: `Rénovation J0-J30 : désherbant bloqué` };
      if (pluiePrevue(w, 3)) return { blocked: true, raison: "Pluie prévue — désherbant lessivé avant absorption" };
      if (tropFroid(w, 10))  return { blocked: true, raison: "Trop froid (<10°C) — désherbant inefficace" };
      return { blocked: false };
    },
    keywords:     ["desherb", "désherb"],
    detail:       (plan, arros, profile, month) => {
      if (isObjectifNaturel(profile)) return "Désherbage MANUEL recommandé · arrachage ou outil à désherber";
      return (month === 9 || month === 10)
        ? "Désherbant sélectif · 2x/mois sept-oct"
        : "Désherbant sélectif · 1x/semaine avr-août";
    },
    needsProduct: true,
    exclusive:    [],
    maxParAn:     24, // ~24 fois/an selon KB
  },

  // ── 11. ANTI-MOUSSE 💊 ───────────────────────────────────────────────────
  // Mars, avril, septembre
  // Zone Ouest/Nord : seuil score abaissé à 75 (humidité chronique)
  // Condition d'activation : sol argileux, ombrage, humidité, score bas
  {
    id:    "antimousse",
    label: "Anti-mousse 💊",
    gp:    "anti_mousse",
    getMois: (zone, sol, isSynth, profile) => {
      return [3, 4, 9];
    },
    getInterval: () => 30,
    getBlocked: (w, profile) => {
      if (isObjectifCreer(profile) && estDansProgramme(profile, 60))
        return { blocked: true, raison: "Création J0-J60 : gazon trop jeune" };
      return { blocked: false };
    },
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
  // Mars à octobre · toutes les 4 semaines (30j min)
  // Seuil température : 25°C toutes zones (été) · Hors été : score < 80
  {
    id:    "biostimulant",
    label: "Biostimulant 🌿",
    gp:    "biostimulant",
    getMois: (zone, sol, isSynth, profile) => {
      return [3,4,5,6,7,8,9,10];
    },
    getInterval: () => 30,
    getBlocked: (w, profile) => {
      if (gelPossible(w)) return { blocked: true, raison: "Gel possible — biostimulant non absorbé" };
      return { blocked: false };
    },
    conditionActive: (profile, score, weather, zone) => {
      // Été (juin-août) : chaleur ≥25°C déclenche automatiquement
      const moisActuel = new Date().getMonth() + 1;
      const ete = [6,7,8].includes(moisActuel) && (weather?.temp_max || 0) >= 25;
      // Hors été : déclenché si score < 80
      return ete || score < 80;
    },
    keywords:     ["biostimulant", "biostimul"],
    detail:       (plan, arros, profile, month, zone) => {
      const estEte = [6,7,8].includes(month);
      return estEte
        ? "Biostimulant · toutes les 4 sem · renforce résistance estivale"
        : "Biostimulant · toutes les 4 sem · stimule reprise et vigueur";
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
    getMois: (zone, sol, isSynth, profile) => {
      if (isObjectifCreer(profile)) return [3,4,5,6,8,9]; // Juin OK si conditions strictes
      return [3, 4, 5, 8, 9];
    },
    getInterval: () => 60,
    getBlocked: (w, profile, zone, score) => {
      if ((w?.temp_max || 0) > 28) return { blocked: true, raison: "Trop chaud (>28°C) — germination compromise" };
      if (gelPossible(w))          return { blocked: true, raison: "Gel possible — semences ne germent pas" };
      // Juin : conditions strictes même pour Créer
      const moisActuel = new Date().getMonth() + 1;
      if (moisActuel === 6) {
        if ((score ?? 70) >= 65) return { blocked: true, raison: "Juin : score trop élevé pour semis (risque concurrence)" };
        if ((w?.temp_max || 0) >= 26) return { blocked: true, raison: "Juin : trop chaud pour semis (≥26°C)" };
      }
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
  // Gazon synthétique supprimé de l'app — isSynth = false partout
  const sol     = profile?.sol;
  const zone    = zoneClimatique(profile);
  const plan    = MONTHLY_PLAN[month];
  const sc      = score ?? 70;
  const jProg   = joursProgramme(profile); // null si pas de programme actif

  return ACTIONS_PLAN.map(action => {
    const mois     = action.getMois(zone, sol, false, profile); // isSynth toujours false — gazon synthétique supprimé
    const since    = daysSince(history, action.keywords);
    const interval = action.getInterval(month, zone, plan);

    // Données enrichies communes
    const base = { action, since, zone, plan };

    // ── 1. Hors saison ────────────────────────────────────────────────────
    if (!mois.includes(month)) {
      return { ...base, status: "off_season", daysLeft: null };
    }

    // ── 2. Arrosage piloté par météo ──────────────────────────────────────
    if (action.weatherDriven && (!arros || arros?.skip)) {
      if (!mois.includes(month)) return { ...base, status: "off_season", daysLeft: null };

      const reason = arros?.reason;

      // Arrosage trop récent — on sait exactement combien de jours
      if (reason === "recency") {
        return {
          ...base,
          status: "too_soon",
          daysLeft: arros.joursRestants ?? 1,
          blockedReason: `Prochain arrosage dans ${arros.joursRestants ?? 1}j`,
        };
      }
      // Pluie forte (≥10mm) ou précipitations suffisantes après déduction
      if (reason === "precip" || reason === "precip_partial") {
        const detail = reason === "precip" && arros?.precip
          ? `${arros.precip}mm de pluie — arrosage inutile aujourd'hui`
          : "Précipitations suffisantes — arrosage inutile aujourd'hui";
        return { ...base, status: "blocked", daysLeft: null, blockedReason: detail };
      }
      // off_season ou inconnu
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
    const blockResult = action.getBlocked(weather || {}, profile, zone, sc);
    if (blockResult.blocked) {
      return {
        ...base,
        status: "blocked",
        daysLeft: null,
        blockedReason: blockResult.raison,
        alternative: blockResult.alternative || null,
      };
    }

    // ── 8. ✅ Recommandé ───────────────────────────────────────────────────
    return {
      ...base,
      status: "recommended",
      daysLeft: null,
      joursProgramme: jProg,
      isManuel: blockResult.isManuel || false,
    };
  });
}
