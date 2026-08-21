// api/parcoursEngine.cjs
// ─────────────────────────────────────────────────────────────────────────────
// MOTEUR DE PARCOURS — Création / Regarnissage (P-1 : décision de semis)
//
// CommonJS pur : aucun import ESM, aucun appel réseau, aucun effet de bord.
// 100% testable. Le front et le cron l'appellent ; eux gèrent la base et la météo.
//
// ⚠️ COHÉRENCE : la logique zone est calquée sur src/lib/planEntretien.js
//    (fonction zoneClimatique). Si le mapping lat/lon→zone change là-bas,
//    répercuter ici. Les fenêtres de semis viennent de la KB "Fenêtres Semis par Zone".
//
// P-1 couvre : mapping lat/lon → zone + canSow (3 vérifications KB).
// P-2 (échéancier) et P-3 (phase courante) viendront ensuite.
// ─────────────────────────────────────────────────────────────────────────────

// ── Données des 8 zones (KB "Fenêtres Semis par Zone") ───────────────────────
// soilMin/soilMax = fourchette de température sol (6 cm) pour germination.

function zoneFromLatLon(lat, lon) {
  if (typeof lat !== "number" || typeof lon !== "number") return "centre"; // défaut sans GPS
  if (lat >= 41.3 && lat <= 43.1 && lon >= 8.5 && lon <= 9.6) return "corse";
  if (lat < 44.5 && lon > 2)  return "sud";
  if (lat < 44.5 && lon <= 2) return "sud_ouest";
  if (lat > 50) return "nord";
  if (lon > 5 && lat >= 46.5 && lat <= 50) return "nord_est";
  if (lon < 0 || (lon < 1.5 && lat > 46)) return "ouest";
  return "centre";
}

// ── Prochaine fenêtre indicative (texte) selon la zone et le mois courant ────
// Sert au message de blocage. Les mois sont INDICATIFS (la vraie décision = sol réel).

// ── Données des 8 zones : fenêtres de semis en DATES FINES + temp. sol ────────
// Chaque fenêtre = { debutPossible, debutOptimal, finOptimal } en [mois, jour].
// Verdict : avant debutPossible → bloqué (trop tôt) ; entre debutPossible et
// debutOptimal → avertissement ; dans [debutOptimal, finOptimal] → feu vert ;
// après finOptimal → bloqué (trop tard). La temp. sol (si dispo) peut rétrograder
// un feu vert en avertissement, jamais débloquer hors-saison.
// Bornes = DÉBUT des fourchettes fournies (choix : permissif).
const ZONES = {
  nord_est: {
    label: "Nord-Est", soilMin: 8, soilMax: 25,
    automne:   { debutPossible: [8, 15],  debutOptimal: [8, 25], finOptimal: [10, 5] },
    printemps: { debutPossible: [3, 25],  debutOptimal: [4, 1],  finOptimal: [5, 15] },
  },
  nord: {
    label: "Nord", soilMin: 8, soilMax: 25,
    automne:   { debutPossible: [8, 15],  debutOptimal: [8, 25], finOptimal: [10, 5] },
    printemps: { debutPossible: [3, 25],  debutOptimal: [4, 1],  finOptimal: [5, 15] },
  },
  ouest: {
    label: "Ouest", soilMin: 8, soilMax: 26,
    automne:   { debutPossible: [8, 20],  debutOptimal: [8, 28], finOptimal: [10, 15] },
    printemps: { debutPossible: [3, 15],  debutOptimal: [3, 25], finOptimal: [5, 15] },
  },
  centre: {
    label: "Centre", soilMin: 8, soilMax: 26,
    automne:   { debutPossible: [8, 20],  debutOptimal: [8, 28], finOptimal: [10, 15] },
    printemps: { debutPossible: [3, 15],  debutOptimal: [3, 25], finOptimal: [5, 15] },
  },
  sud_ouest: {
    label: "Sud-Ouest", soilMin: 8, soilMax: 27,
    automne:   { debutPossible: [8, 25],  debutOptimal: [9, 1],  finOptimal: [10, 15] },
    printemps: { debutPossible: [3, 15],  debutOptimal: [3, 25], finOptimal: [5, 5] },
  },
  sud: {
    label: "Sud", soilMin: 8, soilMax: 28,
    automne:   { debutPossible: [9, 1],   debutOptimal: [9, 1],  finOptimal: [10, 31] },
    printemps: { debutPossible: [3, 1],   debutOptimal: [3, 15], finOptimal: [4, 30] },
  },
  corse: {
    label: "Corse", soilMin: 8, soilMax: 28,
    automne:   { debutPossible: [9, 1],   debutOptimal: [9, 1],  finOptimal: [10, 31] },
    printemps: { debutPossible: [3, 1],   debutOptimal: [3, 15], finOptimal: [4, 30] },
  },
};

// Convertit [mois, jour] en "jour de l'année" (1-366) pour comparaisons, année de réf.
function dayOfYear(month, day, year = 2026) {
  const d = new Date(year, month - 1, day);
  const start = new Date(year, 0, 0);
  return Math.floor((d - start) / 86400000);
}

// Formate [mois, jour] en texte français court (ex. "15 août").
const MOIS_FR = ["", "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
function texteDate([m, j]) { return `${j} ${MOIS_FR[m]}`; }

// Détermine, pour une date de semis donnée, dans quelle fenêtre on se situe
// et le verdict de DATE (avant temp. sol).
// Retourne { statut: "trop_tot"|"avertissement"|"optimal"|"trop_tard",
//            fenetre: "automne"|"printemps", prochaine: {saison, debutPossible} }
function verdictDate(zone, dateSemis) {
  const d = dateSemis ? new Date(dateSemis) : new Date();
  if (isNaN(d.getTime())) return null;
  const jour = dayOfYear(d.getMonth() + 1, d.getDate());

  // Bornes en jour de l'année pour les 2 fenêtres
  const fenetres = [
    { saison: "printemps", ...zone.printemps },
    { saison: "automne",   ...zone.automne },
  ].map(f => ({
    saison: f.saison,
    dp: dayOfYear(f.debutPossible[0], f.debutPossible[1]),
    do: dayOfYear(f.debutOptimal[0], f.debutOptimal[1]),
    fo: dayOfYear(f.finOptimal[0], f.finOptimal[1]),
    debutPossible: f.debutPossible,
    debutOptimal: f.debutOptimal,
    finOptimal: f.finOptimal,
  }));

  // Dans quelle fenêtre tombe-t-on ?
  for (const f of fenetres) {
    if (jour >= f.dp && jour <= f.fo) {
      const statut = (jour < f.do) ? "avertissement" : "optimal";
      return { statut, fenetre: f.saison, f };
    }
  }

  // Hors fenêtre : trouver la PROCHAINE fenêtre (celle dont debutPossible > jour, la plus proche)
  const futures = fenetres
    .map(f => ({ ...f, delta: f.dp - jour }))
    .filter(f => f.delta > 0)
    .sort((a, b) => a.delta - b.delta);

  let prochaine;
  if (futures.length) {
    prochaine = futures[0];
  } else {
    // Aucune fenêtre restante cette année → la 1re de l'an prochain (printemps)
    prochaine = fenetres.reduce((a, b) => (a.dp < b.dp ? a : b));
  }
  return { statut: "trop_tot", fenetre: null, prochaine };
}

// ─────────────────────────────────────────────────────────────────────────────
// canSow — DÉCISION DE SEMIS (dates fines par zone + temp. sol cumulative)
//
// Logique : le verdict de DATE (grille par zone) donne la base.
//   - trop_tot / trop_tard → bloque (peutForcer:false) + prochaine fenêtre
//   - avertissement (entre début possible et optimal) → avertissement (peutForcer:true)
//   - optimal → feu_vert
// La TEMP. SOL (si fournie) peut RÉTROGRADER un feu_vert en avertissement
//   (sol hors [soilMin,soilMax]), jamais débloquer un blocage de saison.
// ─────────────────────────────────────────────────────────────────────────────
function canSow({ zoneKey, lat, lon, soilTemp, month, dateSemis, soilTempSource = "reel" }) {
  const key = zoneKey || zoneFromLatLon(lat, lon);
  const zone = ZONES[key] || ZONES.centre;

  const vd = verdictDate(zone, dateSemis);
  if (!vd) {
    return { verdict: "bloque", zone: zone.label, verif: 0,
      raison: "Date de semis invalide.", peutForcer: false };
  }

  // ── Cas hors saison (trop tôt / trop tard) → bloqué + prochaine fenêtre ────
  if (vd.statut === "trop_tot") {
    const p = vd.prochaine;
    const saisonTxt = p.saison === "automne" ? "d'automne" : "de printemps";
    const prochaineFenetre = `la fenêtre ${saisonTxt} (à partir du ${texteDate(p.debutPossible)})`;
    return { verdict: "bloque", zone: zone.label, verif: 2,
      raison: `Ce n'est pas encore la bonne période pour semer dans votre zone (${zone.label}). Semer maintenant exposerait le jeune gazon à des conditions défavorables.`,
      prochaineFenetre, peutForcer: false };
  }

  // ── Verdict de base selon la date ─────────────────────────────────────────
  let verdict = vd.statut === "optimal" ? "feu_vert" : "avertissement";
  let raison, verif;
  const f = vd.f;
  const fenTxt = vd.fenetre === "automne" ? "d'automne" : "de printemps";

  if (verdict === "avertissement") {
    verif = 3;
    raison = `Le semis est possible, mais la fenêtre ${fenTxt} de votre zone (${zone.label}) devient vraiment optimale à partir du ${texteDate(f.debutOptimal)}. Patienter quelques jours donnerait de meilleurs résultats.`;
  } else {
    verif = 0;
    raison = `Nous sommes en pleine fenêtre ${fenTxt} pour votre zone (${zone.label}) : c'est le moment idéal pour semer.`;
  }

  // ── Temp. sol : peut rétrograder un feu_vert (jamais débloquer) ────────────
  if (typeof soilTemp === "number") {
    const horsFourchette = soilTemp < zone.soilMin || soilTemp > zone.soilMax;
    if (horsFourchette) {
      const sens = soilTemp < zone.soilMin ? "encore trop froid" : "trop chaud";
      if (verdict === "feu_vert") {
        verdict = "avertissement";
        verif = 1;
        raison = `La saison est favorable, mais votre sol est ${sens} (${soilTemp.toFixed(0)}°C, idéal ${zone.soilMin}-${zone.soilMax}°C). Attendez quelques jours qu'il se stabilise pour de meilleurs résultats.`;
      } else {
        // déjà avertissement : on enrichit la raison
        raison += ` De plus, votre sol est ${sens} (${soilTemp.toFixed(0)}°C).`;
      }
    }
  }

  const nuance = soilTempSource === "estime" && typeof soilTemp !== "number"
    ? " (analyse basée sur les moyennes saisonnières de votre zone ; la mesure réelle du sol est disponible en Premium)"
    : "";

  return {
    verdict, zone: zone.label, verif,
    raison: raison + nuance,
    peutForcer: true,
    fenetre: vd.fenetre,
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// P-2 — ÉCHÉANCIER DES 6 PHASES (buildSchedule)
//
// Définition des phases (KB "Parcours Semis"). Bornes en JOURS relatifs à J0
// (= date de semis). Phase 0 et 1 sont AVANT J0 (jours négatifs).
// ─────────────────────────────────────────────────────────────────────────────
const PHASES = [
  {
    phase: 0, cle: "fenetre", nom: "Fenêtre de semis",
    jourDebut: null, jourFin: -7,   // avant la préparation
    action: "Surveillance de la fenêtre optimale (température du sol).",
    arrosage: null,
  },
  {
    phase: 1, cle: "preparation", nom: "Préparation du sol",
    jourDebut: -7, jourFin: 0,
    action: {
      creation: "Travail complet : décompactage, nivellement, amendement.",
      regarnissage: "Scarification + apport d'un terreau de surface.",
    },
    arrosage: null,
  },
  {
    phase: 2, cle: "semis", nom: "Semis",
    jourDebut: 0, jourFin: 0,
    action: {
      creation: "Semis (~35 g/m²) + roulage + premier arrosage copieux.",
      regarnissage: "Semis des zones (~25 g/m²) + roulage + premier arrosage copieux.",
    },
    arrosage: "Premier arrosage copieux (contact graine/sol).",
  },
  {
    phase: 3, cle: "germination", nom: "Germination",
    jourDebut: 1, jourFin: 21,
    action: "Maintenir l'humidité constante en surface (phase critique).",
    arrosage: "Quotidien léger — garder le sol humide sans détremper.",
  },
  {
    phase: 4, cle: "levee", nom: "Levée",
    jourDebut: 21, jourFin: 45,
    action: {
      creation: "Espacer les arrosages ; première tonte haute quand ~8-10 cm.",
      regarnissage: "Repérer les zones clairsemées à re-semer ; première tonte quand ~8-10 cm.",
    },
    arrosage: "Progressivement espacé.",
  },
  {
    phase: 5, cle: "consolidation", nom: "Consolidation",
    jourDebut: 45, jourFin: 60,
    action: "Premier engrais de démarrage puis bascule en entretien classique.",
    arrosage: "Retour au cycle normal.",
  },
];

// Ajoute n jours à une date (Date ou ISO string) → renvoie une Date.
function addDays(base, n) {
  const d = (base instanceof Date) ? new Date(base) : new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}
function isoDay(d) { return d.toISOString().slice(0, 10); }

// buildSchedule — génère l'échéancier daté des 6 phases à partir de dateSemis (J0).
//   type      : "creation" | "regarnissage"
//   dateSemis : date du semis (Date ou "YYYY-MM-DD"). = J0.
// Retourne un tableau de phases datées, avec action/arrosage résolus selon le type.
function buildSchedule({ type, dateSemis }) {
  if (!dateSemis) return null;
  const j0 = (dateSemis instanceof Date) ? new Date(dateSemis) : new Date(dateSemis);
  if (isNaN(j0.getTime())) return null;
  const t = (type === "regarnissage") ? "regarnissage" : "creation";

  return PHASES.map(p => {
    const action = (typeof p.action === "object" && p.action !== null) ? p.action[t] : p.action;
    // Phase 0 : pas de date de début fixe (surveillance) → on borne à J-7 en fin.
    const debut = (p.jourDebut === null) ? null : isoDay(addDays(j0, p.jourDebut));
    const fin   = (p.jourFin === null)   ? null : isoDay(addDays(j0, p.jourFin));
    return {
      phase: p.phase,
      cle: p.cle,
      nom: p.nom,
      jourDebut: p.jourDebut,
      jourFin: p.jourFin,
      dateDebut: debut,
      dateFin: fin,
      action,
      arrosage: p.arrosage,
    };
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// P-3 — PHASE COURANTE + BLOCAGES (currentPhase)
//
// Détermine où en est un parcours ACTIF : phase du jour, jour relatif (Jx),
// action du jour, et les blocages applicables (KB colonne "Cas bloquant").
//
// Le moteur RENVOIE les blocages applicables ; c'est le FRONT qui empêche
// concrètement l'action (ex. griser le bouton "tonte" en phase < 4).
// ─────────────────────────────────────────────────────────────────────────────

// Blocages par phase (KB "Parcours Semis" — colonne Cas bloquant).
// Chaque blocage : { action visée, condition, message }.
const BLOCAGES = {
  // Phase 4 : tonte trop tôt (<8cm) — bloquée tant que le gazon n'a pas atteint
  // la hauteur. Comme on n'a pas la hauteur réelle, on borne par le jour : la
  // 1re tonte n'est possible qu'à partir de la levée établie (~J21).
  tonte: {
    phasesMin: 4,       // avant la phase 4, tonte bloquée
    message: "Première tonte déconseillée avant la levée établie (~3 semaines). Tondre trop tôt arrache les jeunes pousses.",
  },
  // Phase 5 : engrais trop précoce — bloqué avant la consolidation (~J45).
  engrais: {
    phasesMin: 5,
    message: "Engrais de démarrage déconseillé avant la consolidation (~6 semaines). Trop précoce, il brûle les jeunes racines.",
  },
};

// Calcule le jour relatif (Jx) : nb de jours depuis le semis (J0).
function jourRelatif(dateSemis, today) {
  const j0 = (dateSemis instanceof Date) ? new Date(dateSemis) : new Date(dateSemis);
  const now = today ? new Date(today) : new Date();
  if (isNaN(j0.getTime()) || isNaN(now.getTime())) return null;
  return Math.floor((now.getTime() - j0.getTime()) / 86400000);
}

// currentPhase — état du jour d'un parcours actif.
//   type, dateSemis : comme buildSchedule
//   today : date courante (défaut aujourd'hui)
// Retourne { phase, cle, nom, jour, action, arrosage, blocages:[{action,message}] }
// ou un état terminé si J > 60.
function currentPhase({ type, dateSemis, today }) {
  if (!dateSemis) return null;
  const j = jourRelatif(dateSemis, today);
  if (j === null) return null;

  const t = (type === "regarnissage") ? "regarnissage" : "creation";
  const schedule = buildSchedule({ type: t, dateSemis });
  if (!schedule) return null;

  // Parcours terminé au-delà de J60
  if (j > 60) {
    return { phase: 5, cle: "termine", nom: "Parcours terminé", jour: j,
      action: "Votre gazon est établi. Retour à l'entretien classique.",
      arrosage: "Cycle normal.", blocages: [], termine: true };
  }

  // Trouver la phase dont [jourDebut, jourFin] contient j.
  // Phase 0 (jourDebut null) couvre tout ce qui est avant J-7.
  // Sur chevauchement de bornes (ex. J0 = fin prépa ET début semis), on prend
  // la phase la PLUS AVANCÉE (le parcours progresse : le semis prime sur la prépa).
  const matches = schedule.filter(p => {
    const deb = (p.jourDebut === null) ? -Infinity : p.jourDebut;
    const fin = (p.jourFin === null) ? Infinity : p.jourFin;
    return j >= deb && j <= fin;
  });
  let ph = matches.length
    ? matches.reduce((a, b) => (b.phase > a.phase ? b : a))
    : null;
  // Sécurité : si aucune phase trouvée (j entre deux bornes), prendre la plus proche passée.
  if (!ph) {
    ph = schedule.reduce((best, p) => {
      const fin = (p.jourFin === null) ? Infinity : p.jourFin;
      return (j > fin && (!best || fin > best.jourFin)) ? p : best;
    }, null) || schedule[0];
  }

  // Blocages applicables à cette phase
  const blocages = [];
  for (const [action, rule] of Object.entries(BLOCAGES)) {
    if (ph.phase < rule.phasesMin) {
      blocages.push({ action, message: rule.message });
    }
  }

  return {
    phase: ph.phase,
    cle: ph.cle,
    nom: ph.nom,
    jour: j,               // Jx (peut être négatif en préparation)
    action: ph.action,
    arrosage: ph.arrosage,
    blocages,
    termine: false,
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// JALONS PONCTUELS par phase (validables par l'utilisateur dans l'écran de suivi)
// Cocher un jalon = suivi/gamification ; NE change PAS la phase (gouvernée par le temps).
// Un jalon n'est cochable que si la phase courante >= phaseMin du jalon.
// Les phases 0 (fenêtre) et 3 (germination = arrosage récurrent) n'ont pas de jalon ponctuel.
// ─────────────────────────────────────────────────────────────────────────────
const JALONS = [
  { cle: "sol_prepare",    phase: 1, phaseMin: 1, label: "Sol préparé",                 icon: "🪓" },
  { cle: "seme",           phase: 2, phaseMin: 2, label: "Semé",                        icon: "🌱" },
  { cle: "premiere_tonte", phase: 4, phaseMin: 4, label: "Première tonte effectuée",     icon: "✂️" },
  { cle: "engrais_demarr", phase: 5, phaseMin: 5, label: "Engrais de démarrage appliqué", icon: "🧪" },
];

module.exports = { canSow, zoneFromLatLon, ZONES, buildSchedule, PHASES, currentPhase, JALONS };
