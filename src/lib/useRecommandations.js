// src/lib/useRecommandations.js
// Moteur de recommandations — "Papa du gazon"
// Flow : 1. Analyser tout le profil → 2. Conseiller agronomiquement → 3. Équiper selon budget
// 100% localStorage — zéro API — zéro latence

import { useSaison } from "./useSaison";

const KEY_DERNIERE_RECO = "gk_derniere_reco";

// ── Zone climatique déduite des coordonnées GPS ──────────────────────────────
// Couvre toute la France sans exception — bien plus fiable que le nom de ville
// Zones : nord_est | sud | sud_ouest | ouest | nord | centre | corse
function zoneClimatique(ville, coords) {
  const lat = coords?.lat;
  const lon = coords?.lon;

  if (lat && lon) {
    // Corse — île méditerranéenne spécifique
    if (lat >= 41.3 && lat <= 43.1 && lon >= 8.5 && lon <= 9.6) return "corse";

    // Sud méditerranéen — Provence, Languedoc, Roussillon, Côte d'Azur
    if (lat < 44.5 && lon > 2) return "sud";

    // Sud-Ouest — Occitanie hors méditerranée, Nouvelle-Aquitaine sud
    if (lat < 44.5 && lon <= 2) return "sud_ouest";

    // Nord — dessus du 50e parallèle (Nord-Pas-de-Calais, partie Belgique)
    if (lat > 50) return "nord";

    // Nord-Est continental — Alsace, Lorraine, Champagne, Bourgogne-FC
    if (lon > 5 && lat >= 46.5 && lat <= 50) return "nord_est";

    // Ouest océanique — Bretagne, Normandie, Pays de Loire, Poitou
    if (lon < 0 || (lon < 1.5 && lat > 46)) return "ouest";

    // Centre — Île-de-France, Centre-Val de Loire, Auvergne, Rhône-Alpes
    return "centre";
  }

  // Fallback sans GPS — centre par défaut
  return "centre";
}

// ── Coordonnées GPS depuis localStorage ──────────────────────────────────────
function getCoords() {
  try {
    const loc = JSON.parse(localStorage.getItem("gk_location"));
    return loc?.lat && loc?.lon ? { lat: loc.lat, lon: loc.lon } : null;
  } catch { return null; }
}

// ── Helpers météo ─────────────────────────────────────────────────────────────
function gelPossible(meteo) {
  return meteo?.temp_min !== undefined && meteo.temp_min < 4;
}
function tropFroid(meteo, seuil = 10) {
  return meteo?.temp_max !== undefined && meteo.temp_max < seuil;
}
function pluiePrevue(meteo, seuil = 5) {
  return meteo?.precip !== undefined && meteo.precip > seuil;
}
function solDetrempé(meteo) {
  return meteo?.precip !== undefined && meteo.precip > 15;
}
function humideEtFroid(meteo) {
  return meteo?.humidity > 70 && meteo?.temp_max < 18;
}
const DELAI_MIN_JOURS   = 7;

// ── Grilles budget ────────────────────────────────────────────────────────────
// Retourne la gamme de produit adaptée au budget déclaré
function gamme(budget) {
  if (!budget || budget === "inconnu") return "standard";
  if (budget === "0-50")    return "eco";
  if (budget === "50-150")  return "standard";
  if (budget === "150-300") return "qualite";
  return "premium"; // 300-600 et 600+
}

// ── Vérifie si l'utilisateur a un équipement ─────────────────────────────────
function hasMateriel(profil, item) {
  const mat = profil?.materiel || [];
  const ton = profil?.tondeuse || [];
  return [...mat, ...ton].some(m => m.toLowerCase().includes(item.toLowerCase()));
}

// ── Message d'achat matériel si absent ───────────────────────────────────────
function ctaMatériel(profil, item, budget) {
  if (hasMateriel(profil, item)) return "";
  const g = gamme(budget);
  const prix = {
    aerateur:      { eco:"~30€", standard:"~60€", qualite:"~120€", premium:"~250€+" },
    scarificateur: { eco:"~40€", standard:"~80€", qualite:"~150€", premium:"~300€+" },
    epandeur:      { eco:"~20€", standard:"~40€", qualite:"~80€",  premium:"~150€+" },
    tondeuse:      { eco:"~100€",standard:"~200€",qualite:"~400€", premium:"~800€+" },
  };
  const p = prix[item]?.[g] || "";
  return ` 🛒 Vous n'avez pas de ${item} — nous vous recommandons d'en acquérir un (${p}).`;
}

// ── Message engrais adapté au budget ─────────────────────────────────────────
function msgEngrais(budget, type) {
  const g = gamme(budget);
  const produits = {
    starter: {
      eco:      "un engrais NPK basique (ex: 10€/5kg)",
      standard: "un engrais NPK 12-5-5 organo-minéral (ex: 15-20€/5kg)",
      qualite:  "un engrais organique à libération lente (ex: 25-35€/5kg)",
      premium:  "un engrais professionnel bio-stimulé (ex: 40-60€/5kg)",
    },
    ete: {
      eco:      "un engrais été basique NPK (ex: 12€/5kg)",
      standard: "un engrais longue durée NPK 15-5-10 (ex: 20€/5kg)",
      qualite:  "un engrais summer organique (ex: 30€/5kg)",
      premium:  "un engrais professionnel résistance sécheresse (ex: 50€/5kg)",
    },
    automne: {
      eco:      "un engrais automne basique riche en K (ex: 12€/5kg)",
      standard: "un engrais NPK 5-10-25 automne (ex: 18€/5kg)",
      qualite:  "un engrais organique automne (ex: 28€/5kg)",
      premium:  "un engrais professionnel hivernant (ex: 45€/5kg)",
    },
  };
  return produits[type]?.[g] || "un engrais adapté à la saison";
}

// ── Calendrier agronomique ────────────────────────────────────────────────────
const CALENDRIER = {
  engrais_starter: {
    id:           "engrais_starter",
    label:        "Engrais Starter NPK",
    icone:        "🌱",
    mois_valides: [2, 3],
    conditions:   (profil, score, meteo) => {
      if (profil?.pelouse === "synthetique") return false;
      // Pas d'engrais si gel encore possible — engrais brûlerait le gazon
      if (gelPossible(meteo)) return false;
      // Pas si trop froid — engrais inefficace sous 8°C
      if (tropFroid(meteo, 8)) return false;
      // Zone Nord-Est : sol encore froid en février, décaler à mars
      const zone = zoneClimatique(profil?.ville, profil?._coords);
      if (zone === "nord_est" || zone === "nord") return score < 80 && (meteo?.temp_max || 0) >= 10;
      return score < 80;
    },
    max_par_an:   1,
    message:      (score, profil) => {
      const obj = profil?.objectif === "parfait" ? "Pour atteindre votre objectif d'un gazon parfait, " : "";
      const zone = zoneClimatique(profil?.ville, profil?._coords);
      const conseil = zone === "nord_est" ? "Attendez que les températures dépassent 10°C avant d'appliquer." :
                      zone === "sud" ? "Profitez des températures douces pour une application précoce." : "";
      return `${obj}Ton gazon sort de l'hiver avec un score de ${score}/100. Applique ${msgEngrais(profil?.budget, "starter")} pour relancer la croissance. ${conseil}${hasMateriel(profil, "epandeur") ? "" : ctaMatériel(profil, "epandeur", profil?.budget)}`.trim();
    },
    impact_score: "+8 à +12 pts potentiels",
    urgence:      "haute",
  },

  anti_mousse: {
    id:           "anti_mousse",
    label:        "Anti-Mousse Liquide",
    icone:        "🌿",
    mois_valides: [3, 4, 9],
    conditions:   (profil, score, meteo) => {
      if (profil?.pelouse === "synthetique") return false;
      const zone = zoneClimatique(profil?.ville, profil?._coords);
      // Zone Ouest ou Nord-Est → humidité chronique → seuil plus permissif
      const seuilScore = (zone === "ouest" || zone === "nord_est") ? 75 : 65;
      // Humidité élevée + froid → conditions parfaites pour la mousse
      const condMeteo = humideEtFroid(meteo);
      return profil?.sol === "argileux" || profil?.sol === "compacte" ||
             profil?.exposition === "ombrage" || profil?.exposition === "mi-ombre" ||
             condMeteo || score < seuilScore;
    },
    max_par_an:   1,
    message:      (score, profil) => {
      const zone = zoneClimatique(profil?.ville, profil?._coords);
      const raison = profil?.sol === "argileux" ? "votre sol argileux favorise la mousse" :
                     profil?.exposition === "ombrage" ? "l'ombrage de votre terrain favorise la mousse" :
                     zone === "ouest" ? "le climat humide de votre région favorise la mousse" :
                     zone === "nord_est" ? "les hivers humides et froids de votre région favorisent la mousse" :
                     "les conditions actuelles favorisent le développement de la mousse";
      return `${raison.charAt(0).toUpperCase() + raison.slice(1)}. Un traitement anti-mousse maintenant évite une invasion difficile à gérer.${hasMateriel(profil, "pulverisateur") ? "" : " 🛒 Un pulvérisateur facilitera l'application (éco: ~15€)."}`;
    },
    impact_score: "+5 à +10 pts potentiels",
    urgence:      "normale",
  },

  desherbage: {
    id:           "desherbage",
    label:        "Désherbant Sélectif Gazon",
    icone:        "🪴",
    mois_valides: [4, 5, 9],
    conditions:   (profil, score, meteo) => {
      if (profil?.pelouse === "synthetique") return false;
      // Désherbant inefficace si pluie prévue (lessivage) ou trop froid
      if (pluiePrevue(meteo, 3)) return false;
      if (tropFroid(meteo, 10)) return false;
      return score < 70;
    },
    max_par_an:   2,
    message:      (score, profil) => {
      const g = gamme(profil?.budget);
      const produit = g === "eco" ? "un désherbant sélectif basique (~10€)" :
                      g === "premium" ? "un désherbant professionnel sélectif (~40€)" :
                      "un désherbant sélectif gazon (~15-25€)";
      return `C'est la période idéale — les mauvaises herbes sont vulnérables. Utilisez ${produit}.${hasMateriel(profil, "pulverisateur") ? "" : " 🛒 Un pulvérisateur est recommandé pour une application homogène (~15€)."}`;
    },
    impact_score: "+6 à +10 pts potentiels",
    urgence:      "normale",
  },

  engrais_ete: {
    id:           "engrais_ete",
    label:        "Engrais Été Longue Durée",
    icone:        "☀️",
    mois_valides: [5, 6],
    conditions:   (profil, score, meteo) => {
      if (profil?.pelouse === "synthetique") return false;
      // Pas si pluie abondante — lessivage immédiat
      if (solDetrempé(meteo)) return false;
      // Gazon sec/chaud → moins de besoins en engrais été
      if (profil?.pelouse === "sec" || profil?.pelouse === "chaud") return score < 75;
      // Zone Sud → urgence plus haute (chaleur arrive plus tôt)
      const zone = zoneClimatique(profil?.ville, profil?._coords);
      if (zone === "sud" || zone === "sud_ouest") return score < 90;
      return score < 85;
    },
    max_par_an:   1,
    message:      (score, profil) => {
      const zone = zoneClimatique(profil?.ville, profil?._coords);
      const surface = profil?.surface ? ` (prévoyez ~${Math.round(profil.surface * 0.03 * 10) / 10}kg pour vos ${profil.surface}m²)` : "";
      const urgence = (zone === "sud" || zone === "sud_ouest") ? " Dans votre région, les chaleurs arrivent tôt — ne tardez pas !" : "";
      return `Avant la chaleur estivale, applique ${msgEngrais(profil?.budget, "ete")}${surface} pour maintenir densité et couleur tout l'été.${urgence}${hasMateriel(profil, "epandeur") ? "" : ctaMatériel(profil, "epandeur", profil?.budget)}`;
    },
    impact_score: "+8 à +15 pts potentiels",
    urgence:      "haute",
  },

  biostimulant: {
    id:           "biostimulant",
    label:        "Biostimulant Stress Hydrique",
    icone:        "💧",
    mois_valides: [6, 7, 8],
    conditions:   (profil, score, meteo) => {
      if (profil?.pelouse === "synthetique") return false;
      const zone = zoneClimatique(profil?.ville, profil?._coords);
      // Seuil de température adapté à la zone
      const seuilTemp = (zone === "sud" || zone === "sud_ouest") ? 22 : 25;
      const chaud = (meteo?.temp_max || 0) > seuilTemp;
      // Gazon sec/chaud → plus résistant, seuil plus haut
      if (profil?.pelouse === "sec" || profil?.pelouse === "chaud") return chaud && score < 60;
      // Zone Sud → recommandé dès qu'il fait chaud (stress hydrique fréquent)
      if (zone === "sud" || zone === "sud_ouest") return chaud || score < 65;
      return chaud || score < 70;
    },
    max_par_an:   1,
    message:      (score, profil) => {
      const g = gamme(profil?.budget);
      const produit = g === "eco" ? "un biostimulant basique (~12€)" :
                      g === "premium" ? "un biostimulant professionnel acides aminés + algues (~45€)" :
                      "un biostimulant racinaire (~20-30€)";
      return `Les températures élevées stressent votre gazon. ${produit} renforce sa résistance et réduit les besoins en eau de 20-30%.`;
    },
    impact_score: "+5 à +12 pts potentiels",
    urgence:      "haute",
  },

  semences: {
    id:           "semences",
    label:        "Semences Regarnissage Automne",
    icone:        "🌾",
    mois_valides: [8, 9],
    conditions:   (profil, score, meteo) => {
      if (profil?.pelouse === "synthetique") return false;
      // Pas si trop chaud (> 28°C) — germination compromise
      if ((meteo?.temp_max || 0) > 28) return false;
      // Pas si gel — semences ne germent pas
      if (gelPossible(meteo)) return false;
      return score < 75;
    },
    max_par_an:   1,
    message:      (score, profil) => {
      const zone = zoneClimatique(profil?.ville, profil?._coords);
      const surface = profil?.surface ? profil.surface : null;
      const typeGazon = profil?.pelouse === "ombre" ? "mélange ombre/mi-ombre" :
                        profil?.pelouse === "sport" ? "ray-grass résistant" :
                        profil?.pelouse === "sec" ? "fétuque résistante sécheresse" :
                        "mélange universel";
      const quantite = surface ? ` (~${Math.round(surface * 0.035 * 10)/10}kg pour vos ${surface}m²)` : "";
      const g = gamme(profil?.budget);
      const prix = g === "eco" ? "~8€/kg" : g === "premium" ? "~25€/kg" : "~12-18€/kg";
      const timing = zone === "nord_est" ? "Privilégiez la première quinzaine de septembre — le gel arrive tôt dans votre région." :
                     zone === "sud" ? "En région méditerranéenne, août-septembre convient parfaitement — profitez de la rosée matinale." :
                     "Septembre est la meilleure période — sol chaud, rosées matinales, températures douces.";
      return `${timing} Choisissez un ${typeGazon}${quantite} (${prix}).`;
    },
    impact_score: "+10 à +20 pts potentiels",
    urgence:      "haute",
  },

  engrais_automne: {
    id:           "engrais_automne",
    label:        "Engrais Automne Potassium",
    icone:        "🍂",
    mois_valides: [9, 10],
    conditions:   (profil, score, meteo) => {
      if (profil?.pelouse === "synthetique") return false;
      // Pas si gel — engrais ne sera pas absorbé
      if (gelPossible(meteo)) return false;
      // Pas si sol détrempé — lessivage
      if (solDetrempé(meteo)) return false;
      return score < 80;
    },
    max_par_an:   1,
    message:      (score, profil) => {
      const zone = zoneClimatique(profil?.ville, profil?._coords);
      const surface = profil?.surface ? ` (~${Math.round(profil.surface * 0.04 * 10)/10}kg pour vos ${profil.surface}m²)` : "";
      const timing = zone === "nord_est" ? " Dans votre région, appliquez dès septembre — les premières gelées arrivent en octobre." :
                     zone === "sud" ? " Dans votre région, octobre convient parfaitement — les températures restent douces." : "";
      return `L'engrais d'automne riche en potassium prépare ton gazon à l'hiver. Utilise ${msgEngrais(profil?.budget, "automne")}${surface}.${timing}${hasMateriel(profil, "epandeur") ? "" : ctaMatériel(profil, "epandeur", profil?.budget)}`;
    },
    impact_score: "+5 à +10 pts potentiels",
    urgence:      "normale",
  },

  engrais_potassium_hiver: {
    id:           "engrais_potassium_hiver",
    label:        "Engrais Résistance Hiver",
    icone:        "❄️",
    mois_valides: [11],
    conditions:   (profil, score, meteo) => {
      if (profil?.pelouse === "synthetique") return false;
      return score < 70;
    },
    max_par_an:   1,
    message:      (score, profil) => {
      return `Avant l'hiver, un apport de potassium protège les racines du gel. Utilise ${msgEngrais(profil?.budget, "automne")} pour assurer une belle reprise printanière.`;
    },
    impact_score: "+4 à +8 pts potentiels",
    urgence:      "normale",
  },

  aeration: {
    id:           "aeration",
    label:        "Aération / Carottage",
    icone:        "🌀",
    mois_valides: [3, 4, 9],
    conditions:   (profil, score, meteo) => {
      if (profil?.pelouse === "synthetique") return false;
      // Aération contre-productive si sol détrempé — attend que ça sèche
      if (solDetrempé(meteo)) return false;
      // Sol compacté ou argileux → aération fortement recommandée
      return profil?.sol === "argileux" || profil?.sol === "compacte" || score < 70;
    },
    max_par_an:   1,
    message:      (score, profil) => {
      const raison = profil?.sol === "argileux" ? "Votre sol argileux se compacte rapidement" :
                     profil?.sol === "compacte" ? "Votre sol compacté étouffe les racines" :
                     "Votre gazon bénéficierait d'une meilleure aération racinaire";
      return `${raison}. L'aération (carottage) améliore la pénétration de l'eau et des engrais.${ctaMatériel(profil, "aerateur", profil?.budget)}`;
    },
    impact_score: "+8 à +15 pts potentiels",
    urgence:      "haute",
  },

  scarification: {
    id:           "scarification",
    label:        "Scarification",
    icone:        "🔩",
    mois_valides: [3, 4, 9],
    conditions:   (profil, score, meteo) => {
      if (profil?.pelouse === "synthetique") return false;
      // Scarification inefficace si sol mouillé ou trop froid
      if (pluiePrevue(meteo, 3)) return false;
      if (tropFroid(meteo, 10)) return false;
      return score < 75;
    },
    max_par_an:   1,
    message:      (score, profil) => {
      return `La scarification élimine le feutre (couche de matière organique morte) qui étouffe votre gazon et réduit l'efficacité des engrais.${ctaMatériel(profil, "scarificateur", profil?.budget)}`;
    },
    impact_score: "+6 à +12 pts potentiels",
    urgence:      "normale",
  },
};

// ── Helpers localStorage ──────────────────────────────────────────────────────
function getDerniereReco() {
  try { return JSON.parse(localStorage.getItem(KEY_DERNIERE_RECO)) || {}; }
  catch { return {}; }
}

function saveDerniereReco(data) {
  try { localStorage.setItem(KEY_DERNIERE_RECO, JSON.stringify(data)); } catch {}
}

function joursDepuis(timestamp) {
  if (!timestamp) return 999;
  return Math.floor((Date.now() - timestamp) / 86400000);
}

function nombreApplicationsAnneeCourante(produitId) {
  const reco = getDerniereReco();
  const anneeActuelle = new Date().getFullYear();
  return (reco[produitId] || []).filter(ts =>
    new Date(ts).getFullYear() === anneeActuelle
  ).length;
}

function enregistrerApplication(produitId) {
  const reco = getDerniereReco();
  const historique = reco[produitId] || [];
  reco[produitId] = [...historique, Date.now()].slice(-10);
  saveDerniereReco(reco);
}

// ── Hook principal ────────────────────────────────────────────────────────────
export function useRecommandations(profil, score, meteo) {
  const { mois, isHivernal } = useSaison();

  if (isHivernal) {
    return { recommandations: [], recommandationPrincipale: null, enregistrerApplication };
  }

  // Enrichir le profil avec les coordonnées GPS pour la zone climatique
  const coords = getCoords();
  const profilAvecCoords = profil ? { ...profil, _coords: coords } : profil;

  const derniereReco = getDerniereReco();

  const recommandations = Object.values(CALENDRIER).filter(produit => {
    if (!produit.mois_valides.includes(mois)) return false;
    if (!produit.conditions(profilAvecCoords, score, meteo)) return false;
    const nbCetteAnnee = nombreApplicationsAnneeCourante(produit.id);
    if (nbCetteAnnee >= produit.max_par_an) return false;
    const dernieres = derniereReco[produit.id] || [];
    const dernierAffichage = dernieres[dernieres.length - 1];
    if (joursDepuis(dernierAffichage) < DELAI_MIN_JOURS) return false;
    return true;
  }).sort((a, b) => {
    if (a.urgence === "haute" && b.urgence !== "haute") return -1;
    if (b.urgence === "haute" && a.urgence !== "haute") return 1;
    return 0;
  });

  // Enrichir les recommandations avec profilAvecCoords pour les messages
  const recommandationPrincipale = recommandations[0] ? {
    ...recommandations[0],
    message: (score, p) => recommandations[0].message(score, p || profilAvecCoords),
  } : null;

  const moisSuivant = mois === 12 ? 1 : mois + 1;
  const produitsAVenir = Object.values(CALENDRIER).filter(produit => {
    if (produit.mois_valides.includes(mois)) return false;
    if (!produit.mois_valides.includes(moisSuivant)) return false;
    return true;
  }).slice(0, 1);

  return {
    recommandations:          recommandations.slice(0, 2),
    recommandationPrincipale,
    produitsAVenir,
    enregistrerApplication,
    calendrierMois: CALENDRIER,
  };
}

// ── Conseil contextuel après chaque action ────────────────────────────────────
export function getConseilApresAction(action, mois, profil, score) {
  const conseilsActions = {
    tonte: {
      [2]: "🌱 Après la première tonte de l'année, surveille la repousse — si elle est lente, un engrais starter sera bientôt utile.",
      [3]: "✂️ Bonne tonte ! Si tu observes de la mousse, mars est la bonne période pour traiter.",
      [4]: "✂️ Tonte effectuée. Continue à surveiller la densité de ton gazon.",
      [5]: "✂️ Avec la chaleur qui arrive, pense à ne pas tondre trop ras — une hauteur de 5-6cm protège les racines.",
      [6]: "☀️ En été, laisse le gazon plus haut (6-7cm) — ça réduit le stress hydrique.",
      [7]: "💧 Par forte chaleur, tonds tôt le matin et maintiens une hauteur de 7cm minimum.",
      [8]: "🌾 Fin août — si ton gazon est clairsemé, septembre sera parfait pour resemer.",
      [9]: "🍂 Bonne tonte d'automne ! C'est aussi le bon moment pour scarifier si besoin.",
      [10]: "🍂 Avant l'hiver, tonds une dernière fois à 4-5cm — ni trop court ni trop long.",
      default: "✂️ Tonte enregistrée — +50 GreenPoints !",
    },
    arrosage: {
      [6]: "💧 En juin, arrose tôt le matin — moins d'évaporation et risque de maladies réduit.",
      [7]: "💧 Canicule : arrose en profondeur 2-3x/semaine plutôt que superficiellement chaque jour.",
      [8]: "💧 Août chaud : si ton gazon jaunit c'est normal. Un biostimulant peut aider.",
      default: "💧 Arrosage enregistré — +20 GreenPoints !",
    },
    engrais: {
      default: "🌱 Engrais appliqué ! Résultats visibles en 10-15 jours. Surveille l'évolution de ton score.",
    },
    aeration: {
      [3]: "🌀 Parfait timing ! L'aération de printemps favorise la pénétration des engrais et de l'eau.",
      [9]: "🌀 Excellente décision ! L'aération d'automne prépare ton gazon pour une belle reprise au printemps.",
      default: "🌀 Aération effectuée — +100 GreenPoints ! Les racines vont respirer.",
    },
    default: null,
  };

  const conseilsProduit = conseilsActions[action];
  if (!conseilsProduit) return null;
  return conseilsProduit[mois] || conseilsProduit.default || null;
}
