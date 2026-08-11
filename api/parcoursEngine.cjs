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
// contrainteEte / contrainteHiver = mois (1-12) où semer est déconseillé.
const ZONES = {
  nord_est:  { label: "Nord-Est",  soilMin: 12, soilMax: 25, contrainteEte: [7, 8],       contrainteHiver: [11, 12, 1, 2, 3] },
  nord:      { label: "Nord",      soilMin: 12, soilMax: 25, contrainteEte: [7, 8],       contrainteHiver: [11, 12, 1, 2, 3] },
  ouest:     { label: "Ouest",     soilMin: 10, soilMax: 26, contrainteEte: [8],          contrainteHiver: [12, 1, 2] },
  centre:    { label: "Centre",    soilMin: 11, soilMax: 26, contrainteEte: [7, 8],       contrainteHiver: [12, 1, 2] },
  sud_ouest: { label: "Sud-Ouest", soilMin: 10, soilMax: 27, contrainteEte: [6, 7, 8, 9], contrainteHiver: [1] },
  sud:       { label: "Sud",       soilMin: 10, soilMax: 28, contrainteEte: [5, 6, 7, 8, 9], contrainteHiver: [] },
  corse:     { label: "Corse",     soilMin: 10, soilMax: 28, contrainteEte: [6, 7, 8, 9], contrainteHiver: [] },
};

// ── Mapping lat/lon → zone (calqué sur planEntretien.zoneClimatique) ─────────
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
function prochaineFenetreTexte(zoneKey, month) {
  // Fenêtres d'automne (mois d'ouverture indicatif) et de printemps par zone
  const FENETRES = {
    nord_est:  { printemps: "mi-avril", automne: "fin août" },
    nord:      { printemps: "fin avril", automne: "mi-août" },
    ouest:     { printemps: "début avril", automne: "début septembre" },
    centre:    { printemps: "mi-avril", automne: "fin août" },
    sud_ouest: { printemps: "début mars", automne: "mi-septembre" },
    sud:       { printemps: "fin février", automne: "fin septembre" },
    corse:     { printemps: "fin février", automne: "octobre" },
  };
  const f = FENETRES[zoneKey] || FENETRES.centre;
  // Si on est en 1er semestre → prochaine = automne ; sinon → printemps prochain
  return (month <= 6) ? `la fenêtre d'automne (vers ${f.automne})` : `la fenêtre de printemps (vers ${f.printemps})`;
}

// ── Aide V3 : nombre de jours entre une date de semis et la 1re contrainte ────
// Retourne le nb de jours avant le 1er jour du 1er mois de contrainte été à venir,
// ou null si aucune contrainte été dans les 12 prochains mois.
function joursAvantContrainte(zone, dateSemis) {
  const start = dateSemis ? new Date(dateSemis) : new Date();
  if (isNaN(start.getTime())) return null;
  if (!zone.contrainteEte.length) return null;

  // Chercher le prochain 1er jour d'un mois de contrainte été (dans les 12 mois)
  let best = null;
  for (let i = 0; i < 13; i++) {
    const probe = new Date(start.getFullYear(), start.getMonth() + i, 1);
    if (zone.contrainteEte.includes(probe.getMonth() + 1)) {
      const diff = Math.round((probe.getTime() - start.getTime()) / 86400000);
      if (diff >= 0) { best = diff; break; }
    }
  }
  return best;
}

// ─────────────────────────────────────────────────────────────────────────────
// canSow — DÉCISION DE SEMIS (logique 3 vérifications KB)
//
// Entrées :
//   zoneKey / lat+lon : zone (déduite si lat/lon)
//   soilTemp : température sol 6cm (°C). Premium = réel ; Free = estimation.
//   month    : mois courant (1-12)
//   dateSemis: date prévue de semis (pour V3 en jours). Défaut = aujourd'hui.
//   soilTempSource : "reel" | "estime"
//
// Sortie : { verdict, zone, verif, raison, prochaineFenetre?, peutForcer? }
//   verdict "feu_vert"    → lancement direct
//   verdict "avertissement" → laissez-passer (peutForcer:true) + prochaine fenêtre
//   verdict "bloque"      → pas de lancement + prise de RDV (prochaine fenêtre)
//
// V1 sol dans [min,max] · V2 mois hors contrainte · V3 marge ≥ 40j avant contrainte
// ─────────────────────────────────────────────────────────────────────────────
function canSow({ zoneKey, lat, lon, soilTemp, month, dateSemis, soilTempSource = "reel" }) {
  const key = zoneKey || zoneFromLatLon(lat, lon);
  const zone = ZONES[key] || ZONES.centre;
  const m = month || (new Date().getMonth() + 1);

  // ── V1 : température du sol dans la fourchette ────────────────────────────
  if (typeof soilTemp === "number") {
    if (soilTemp < zone.soilMin) {
      return { verdict: "bloque", zone: zone.label, verif: 1,
        raison: `Le sol de votre zone (${zone.label}) est à ${soilTemp.toFixed(0)}°C, en dessous des ${zone.soilMin}°C nécessaires à la germination. Aucune graine ne lèvera dans ces conditions.`,
        prochaineFenetre: prochaineFenetreTexte(key, m), peutForcer: false };
    }
    if (soilTemp > zone.soilMax) {
      return { verdict: "bloque", zone: zone.label, verif: 1,
        raison: `Le sol de votre zone (${zone.label}) est à ${soilTemp.toFixed(0)}°C, au-dessus du maximum de ${zone.soilMax}°C. La chaleur compromettrait la germination et brûlerait les jeunes pousses.`,
        prochaineFenetre: prochaineFenetreTexte(key, m), peutForcer: false };
    }
  }

  // ── V2 : mois courant hors contrainte majeure ─────────────────────────────
  if (zone.contrainteEte.includes(m)) {
    return { verdict: "bloque", zone: zone.label, verif: 2,
      raison: `Nous sommes en pleine période estivale défavorable pour votre zone (${zone.label}) : chaleur et sécheresse feraient échouer l'établissement du gazon.`,
      prochaineFenetre: prochaineFenetreTexte(key, m), peutForcer: false };
  }
  if (zone.contrainteHiver.includes(m)) {
    return { verdict: "bloque", zone: zone.label, verif: 2,
      raison: `Nous sommes en période hivernale défavorable pour votre zone (${zone.label}) : le sol est trop froid et la croissance à l'arrêt.`,
      prochaineFenetre: prochaineFenetreTexte(key, m), peutForcer: false };
  }

  // ── V3 : marge suffisante (≥ 40j) avant la 1re contrainte estivale ────────
  const marge = joursAvantContrainte(zone, dateSemis);
  if (marge !== null && marge < 40) {
    return { verdict: "avertissement", zone: zone.label, verif: 3,
      raison: `Le semis est possible, mais l'établissement du gazon (~45-60 jours) n'aurait que ${marge} jours avant l'arrivée de la période chaude de votre zone. Le jeune gazon risquerait de souffrir. L'autre fenêtre saisonnière serait plus sûre.`,
      prochaineFenetre: prochaineFenetreTexte(key, m), peutForcer: true };
  }

  // ── Toutes les vérifications passent ──────────────────────────────────────
  const nuance = soilTempSource === "estime"
    ? " D'après notre estimation saisonnière pour votre zone (la mesure réelle et localisée est disponible en Premium)."
    : "";
  return { verdict: "feu_vert", zone: zone.label,
    raison: `Toutes les conditions sont réunies pour semer : température du sol favorable et fenêtre saisonnière dégagée.${nuance}`,
    peutForcer: true };
}

module.exports = { canSow, zoneFromLatLon, ZONES };
