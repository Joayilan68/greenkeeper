// src/lib/useRecommandations.js
// Moteur de recommandations — "Papa du gazon"
// Flow : 1. Analyser tout le profil → 2. Conseiller agronomiquement → 3. Équiper selon budget
// 100% localStorage — zéro API — zéro latence

import { useSaison } from "./useSaison";

const KEY_DERNIERE_RECO = "gk_derniere_reco";
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
      return score < 80;
    },
    max_par_an:   1,
    message:      (score, profil) => {
      const obj = profil?.objectif === "parfait" ? "Pour atteindre votre objectif d'un gazon parfait, " : "";
      return `${obj}Ton gazon sort de l'hiver avec un score de ${score}/100. Applique ${msgEngrais(profil?.budget, "starter")} pour relancer la croissance.${hasMateriel(profil, "epandeur") ? "" : ctaMatériel(profil, "epandeur", profil?.budget)}`;
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
      // Fix bug : profil.sol au lieu de profil.typeSol
      return profil?.sol === "argileux" || profil?.sol === "compacte" ||
             profil?.exposition === "ombrage" || profil?.exposition === "mi-ombre" || score < 65;
    },
    max_par_an:   1,
    message:      (score, profil) => {
      const raison = profil?.sol === "argileux" ? "votre sol argileux favorise la mousse" :
                     profil?.exposition === "ombrage" ? "l'ombrage de votre terrain favorise la mousse" :
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
      // Gazon sec/chaud → moins de besoins en engrais été
      if (profil?.pelouse === "sec" || profil?.pelouse === "chaud") return score < 75;
      return score < 85;
    },
    max_par_an:   1,
    message:      (score, profil) => {
      const surface = profil?.surface ? ` (prévoyez ~${Math.round(profil.surface * 0.03 * 10) / 10}kg pour vos ${profil.surface}m²)` : "";
      return `Avant la chaleur estivale, applique ${msgEngrais(profil?.budget, "ete")}${surface} pour maintenir densité et couleur tout l'été.${hasMateriel(profil, "epandeur") ? "" : ctaMatériel(profil, "epandeur", profil?.budget)}`;
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
      // Fix bug : meteo.temp_max au lieu de meteo.temperature
      const chaud = meteo?.temp_max > 25 || meteo?.temp_max > 22;
      // Gazon sec/chaud → plus résistant, seuil plus haut
      if (profil?.pelouse === "sec" || profil?.pelouse === "chaud") return chaud && score < 60;
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
      return score < 75;
    },
    max_par_an:   1,
    message:      (score, profil) => {
      const surface = profil?.surface ? profil.surface : null;
      const typeGazon = profil?.pelouse === "ombre" ? "mélange ombre/mi-ombre" :
                        profil?.pelouse === "sport" ? "ray-grass résistant" :
                        profil?.pelouse === "sec" ? "fétuque résistante sécheresse" :
                        "mélange universel";
      const quantite = surface ? ` (~${Math.round(surface * 0.035 * 10)/10}kg pour vos ${surface}m²)` : "";
      const g = gamme(profil?.budget);
      const prix = g === "eco" ? "~8€/kg" : g === "premium" ? "~25€/kg" : "~12-18€/kg";
      return `Septembre est la meilleure période pour semer — sol chaud, rosées matinales, températures douces. Choisissez un ${typeGazon}${quantite} (${prix}).`;
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
      return score < 80;
    },
    max_par_an:   1,
    message:      (score, profil) => {
      const surface = profil?.surface ? ` (~${Math.round(profil.surface * 0.04 * 10)/10}kg pour vos ${profil.surface}m²)` : "";
      return `L'engrais d'automne riche en potassium prépare ton gazon à l'hiver. Utilise ${msgEngrais(profil?.budget, "automne")}${surface}.${hasMateriel(profil, "epandeur") ? "" : ctaMatériel(profil, "epandeur", profil?.budget)}`;
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

  const derniereReco = getDerniereReco();

  const recommandations = Object.values(CALENDRIER).filter(produit => {
    if (!produit.mois_valides.includes(mois)) return false;
    if (!produit.conditions(profil, score, meteo)) return false;
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

  const recommandationPrincipale = recommandations[0] || null;

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
