// src/lib/useRecommandations.js
// Moteur de recommandations produits intelligent
// Règle d'or : bon produit + bonne période + bon besoin = 1 seul conseil à la fois
// 100% localStorage — zéro API — zéro latence

import { useSaison } from "./useSaison";

const KEY_DERNIERE_RECO = "gk_derniere_reco";
const DELAI_MIN_JOURS   = 7; // minimum 7 jours entre 2 suggestions

// ── Calendrier agronomique strict ────────────────────────────────────────────
// mois valides = périodes où le produit EST RÉELLEMENT UTILE
const CALENDRIER = {
  engrais_starter: {
    id:             "engrais_starter",
    label:          "Engrais Starter NPK",
    icone:          "🌱",
    mois_valides:   [2, 3],       // Fév-Mars uniquement
    conditions:     (profil, score, meteo) => score < 80,
    max_par_an:     1,
    message:        (score) => `Ton gazon sort de l'hiver avec un score de ${score}/100. Un engrais starter NPK relance la croissance dès les premières chaleurs.`,
    impact_score:   "+8 à +12 pts potentiels",
    urgence:        "haute",
  },
  anti_mousse: {
    id:             "anti_mousse",
    label:          "Anti-Mousse Liquide",
    icone:          "🌿",
    mois_valides:   [3, 4, 9],    // Printemps et automne
    conditions:     (profil, score, meteo) => profil?.typeSol === "argileux" || score < 65,
    max_par_an:     1,
    message:        (score) => `Les conditions actuelles favorisent le développement de la mousse. Un traitement maintenant évite une invasion difficile à gérer ensuite.`,
    impact_score:   "+5 à +10 pts potentiels",
    urgence:        "normale",
  },
  desherbage: {
    id:             "desherbage",
    label:          "Désherbant Sélectif Gazon",
    icone:          "🪴",
    mois_valides:   [4, 5, 9],
    conditions:     (profil, score, meteo) => score < 70,
    max_par_an:     2,
    message:        () => `C'est la période idéale pour un désherbage sélectif — les mauvaises herbes sont en pleine croissance et vulnérables au traitement.`,
    impact_score:   "+6 à +10 pts potentiels",
    urgence:        "normale",
  },
  engrais_ete: {
    id:             "engrais_ete",
    label:          "Engrais Été Longue Durée",
    icone:          "☀️",
    mois_valides:   [5, 6],
    conditions:     (profil, score, meteo) => score < 85,
    max_par_an:     1,
    message:        (score) => `Avant la chaleur estivale, un engrais longue durée maintient la densité et la couleur de ton gazon tout l'été.`,
    impact_score:   "+8 à +15 pts potentiels",
    urgence:        "haute",
  },
  biostimulant: {
    id:             "biostimulant",
    label:          "Biostimulant Stress Hydrique",
    icone:          "💧",
    mois_valides:   [6, 7, 8],
    conditions:     (profil, score, meteo) => meteo?.temperature > 25 || score < 70,
    max_par_an:     1,
    message:        (score) => `Les températures élevées stressent ton gazon. Un biostimulant racinaire renforce sa résistance à la chaleur et réduit les besoins en eau.`,
    impact_score:   "+5 à +12 pts potentiels",
    urgence:        "haute",
  },
  semences: {
    id:             "semences",
    label:          "Semences Regarnissage Automne",
    icone:          "🌾",
    mois_valides:   [8, 9],       // Fin août et septembre uniquement
    conditions:     (profil, score, meteo) => score < 75,
    max_par_an:     1,
    message:        () => `Septembre est le meilleur mois de l'année pour semer — sol chaud, rosées matinales, températures douces. Ne manquez pas cette fenêtre !`,
    impact_score:   "+10 à +20 pts potentiels",
    urgence:        "haute",
  },
  engrais_automne: {
    id:             "engrais_automne",
    label:          "Engrais Automne Potassium",
    icone:          "🍂",
    mois_valides:   [9, 10],
    conditions:     (profil, score, meteo) => score < 80,
    max_par_an:     1,
    message:        () => `L'engrais d'automne riche en potassium prépare ton gazon à l'hiver — meilleure résistance au gel et reprise plus rapide au printemps.`,
    impact_score:   "+5 à +10 pts potentiels",
    urgence:        "normale",
  },
  engrais_potassium_hiver: {
    id:             "engrais_potassium_hiver",
    label:          "Engrais Résistance Hiver",
    icone:          "❄️",
    mois_valides:   [11],         // Novembre uniquement — transition
    conditions:     (profil, score, meteo) => score < 70,
    max_par_an:     1,
    message:        () => `Avant l'hiver, un apport de potassium protège les racines du gel et assure une belle reprise printanière.`,
    impact_score:   "+4 à +8 pts potentiels",
    urgence:        "normale",
  },
  // Aucun produit en décembre-janvier
};

// ── Helpers localStorage ─────────────────────────────────────────────────────
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
  return (reco[produitId] || []).filter(ts => {
    return new Date(ts).getFullYear() === anneeActuelle;
  }).length;
}

function enregistrerApplication(produitId) {
  const reco = getDerniereReco();
  const historique = reco[produitId] || [];
  reco[produitId] = [...historique, Date.now()].slice(-10);
  saveDerniereReco(reco);
}

// ── Hook principal ────────────────────────────────────────────────────────────
export function useRecommandations(profil, score, meteo) {
  const { mois, isHivernal, isTransition } = useSaison();

  // En mode hivernal pur → aucune recommandation
  if (isHivernal) {
    return { recommandations: [], recommandationPrincipale: null, enregistrerApplication };
  }

  const derniereReco = getDerniereReco();

  // ── Filtrage strict ──────────────────────────────────────────────────────
  const recommandations = Object.values(CALENDRIER).filter(produit => {

    // 1. Vérification période agronomique
    if (!produit.mois_valides.includes(mois)) return false;

    // 2. Vérification conditions réelles (score, profil, météo)
    if (!produit.conditions(profil, score, meteo)) return false;

    // 3. Vérification plafond annuel
    const nbCetteAnnee = nombreApplicationsAnneeCourante(produit.id);
    if (nbCetteAnnee >= produit.max_par_an) return false;

    // 4. Délai minimum entre 2 suggestions du même produit
    const dernieres = derniereReco[produit.id] || [];
    const dernierAffichage = dernieres[dernieres.length - 1];
    if (joursDepuis(dernierAffichage) < DELAI_MIN_JOURS) return false;

    return true;

  }).sort((a, b) => {
    // Priorité : urgence haute d'abord, puis impact score potentiel
    if (a.urgence === "haute" && b.urgence !== "haute") return -1;
    if (b.urgence === "haute" && a.urgence !== "haute") return 1;
    return 0;
  });

  // ── 1 seul produit principal à la fois ──────────────────────────────────
  const recommandationPrincipale = recommandations[0] || null;

  // ── Produits "à venir" — mois suivant ───────────────────────────────────
  const moisSuivant = mois === 12 ? 1 : mois + 1;
  const produitsAVenir = Object.values(CALENDRIER).filter(produit => {
    if (produit.mois_valides.includes(mois)) return false; // déjà actif
    if (!produit.mois_valides.includes(moisSuivant)) return false;
    return true;
  }).slice(0, 1); // max 1 produit à anticiper

  return {
    recommandations:         recommandations.slice(0, 2), // max 2 visibles
    recommandationPrincipale,
    produitsAVenir,
    enregistrerApplication,
    calendrierMois: CALENDRIER,
  };
}

// ── Conseil contextuel après chaque action ───────────────────────────────────
// Appelé depuis Today.jsx après enregistrement d'une action
export function getConseilApresAction(action, mois, profil, score) {

  // Règle d'or : jamais de suggestion d'engrais après une simple tonte
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
