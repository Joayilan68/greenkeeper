// arrosage_base = besoin HEBDOMADAIRE total en mm (agronomique)
// arrosage_freq = nombre de sessions d'arrosage par semaine recommandées
export const MONTHLY_PLAN = {
  1:  { tonte:"Aucune",             engrais:null,                                  verticut:false, arrosage_base:0,  arrosage_freq:0, aeration:false, label:"Repos hivernal",       hauteur:null },
  2:  { tonte:"35 mm si repousse",  engrais:null,                                  verticut:false, arrosage_base:3,  arrosage_freq:1, aeration:true,  label:"Réveil de la pelouse", hauteur:35 },
  3:  { tonte:"30 mm · 1-2x/sem",  engrais:"NPK 12-5-5 organo-minéral · 30-40 g/m²", verticut:false, arrosage_base:10, arrosage_freq:2, aeration:true,  label:"Reprise printanière",  hauteur:30 },
  4:  { tonte:"25-30 mm · 2x/sem", engrais:"NPK 15-5-10 · 30-40 g/m²",           verticut:true,  arrosage_base:13, arrosage_freq:2, aeration:false, label:"Croissance active",     hauteur:28 },
  5:  { tonte:"25 mm · 2-3x/sem",  engrais:"NPK 15-5-10 · 30 g/m²",              verticut:true,  arrosage_base:15, arrosage_freq:3, aeration:false, label:"Pleine saison",         hauteur:25 },
  6:  { tonte:"28-30 mm · 2x/sem", engrais:"NPK 10-5-15 équilibré · 25-30 g/m²", verticut:true,  arrosage_base:17, arrosage_freq:3, aeration:false, label:"Surveillance chaleur",  hauteur:29 },
  7:  { tonte:"30-35 mm · 1-2x/sem",engrais:"NPK 8-0-20 riche K · 20-25 g/m²",  verticut:false, arrosage_base:22, arrosage_freq:3, aeration:false, label:"Protection estivale",   hauteur:32 },
  8:  { tonte:"30-35 mm · 1-2x/sem",engrais:"NPK 8-0-20 · 20 g/m²",             verticut:false, arrosage_base:20, arrosage_freq:3, aeration:false, label:"Stress hydrique",       hauteur:32 },
  9:  { tonte:"28-30 mm · 1-2x/sem",engrais:"NPK 5-10-25 automne · 40 g/m²",    verticut:false, arrosage_base:16, arrosage_freq:2, aeration:true,  label:"Rénovation automnale",  hauteur:29 },
  10: { tonte:"30 mm · 1x/sem",    engrais:null,                                  verticut:false, arrosage_base:10, arrosage_freq:1, aeration:false, label:"Préparation hiver",     hauteur:30 },
  11: { tonte:"35 mm si pousse",   engrais:"Chaux magnésienne si pH<6 · 150-200 g/m²", verticut:false, arrosage_base:0, arrosage_freq:0, aeration:false, label:"Fin de saison",  hauteur:35 },
  12: { tonte:"Aucune",            engrais:null,                                   verticut:false, arrosage_base:0,  arrosage_freq:0, aeration:false, label:"Repos complet",        hauteur:null },
};

export const MONTHS_FR = ["","Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
export const DAYS_FR = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];

export const SOIL_COEFF = {
  argileux: 0.8,
  limoneux: 1.0,
  sableux:  1.3,
  calcaire: 1.1,
  humifere: 0.9,
  compacte: 0.85,
  inconnu:  1.0,
};

// ── Mis à jour pour correspondre aux nouveaux IDs de profil ──────────────────
export const LAWN_COEFF = {
  sport:      1.4,  // résistant au piétinement — fort besoin en eau
  ornemental: 1.2,  // pelouse esthétique — besoin modéré-élevé
  ombre:      0.9,  // mi-ombre — besoin réduit
  sec:        0.7,  // résistant à la sécheresse — besoin faible
  universel:  1.0,  // standard
  chaud:      0.8,  // climat chaud, espèces adaptées
  inconnu:    1.0,
  // Rétrocompat anciens IDs
  ornement:   1.2,
  rustique:   0.8,
  "ombre-semi-ombre": 0.9,
};

// ── Débit arroseur par défaut (mm/h) ─────────────────────────────────────────
// Correspond à un arroseur oscillant résidentiel standard sur une pelouse moyenne.
// Configurable en Premium via localStorage "mg360_debit_mmh".
export const DEBIT_DEFAULT_MMH = 8;

export function getDebitMmH() {
  try {
    const v = parseFloat(localStorage.getItem("mg360_debit_mmh"));
    return (!isNaN(v) && v >= 1 && v <= 20) ? v : DEBIT_DEFAULT_MMH;
  } catch { return DEBIT_DEFAULT_MMH; }
}

export function calcArrosage(month, profile, weather, history = [], debitMmH = DEBIT_DEFAULT_MMH) {
  const plan = MONTHLY_PLAN[month];
  const baseHebdo = plan?.arrosage_base ?? 0;
  const freq      = plan?.arrosage_freq ?? 0;
  if (baseHebdo === 0 || freq === 0) return { skip: true, reason: "off_season" };

  // ── Vérification historique — intervalle adaptatif selon fréquence ────────
  // Ex : 3x/sem → intervalle min = floor(7/3) = 2 jours = 48h
  const intervalHeures = Math.floor(7 / freq) * 24;
  const maintenant = Date.now();
  const dernierArrosage = history
    ?.filter(h => h.action?.toLowerCase().includes("arrosage"))
    .map(h => {
      try {
        const [d, m, y] = (h.date || "").split("/");
        return new Date(y, m - 1, d).getTime();
      } catch { return 0; }
    })
    .filter(Boolean)
    .sort((a, b) => b - a)[0];

  if (dernierArrosage) {
    const heuresDepuis = (maintenant - dernierArrosage) / (1000 * 60 * 60);
    if (heuresDepuis < intervalHeures) {
    const joursRestants = Math.ceil((intervalHeures - (maintenant - dernierArrosage) / (1000 * 60 * 60)) / 24);
    return { skip: true, reason: "recency", joursRestants };
  }
  }

  // ── Dose par session = besoin hebdomadaire ÷ fréquence ────────────────────
  const soil = SOIL_COEFF[profile?.sol] ?? 1;
  const lawn = LAWN_COEFF[profile?.pelouse] ?? 1;
  let mm = (baseHebdo / freq) * soil * lawn;

  if (weather) {
    // Chaleur → augmente les besoins
    if (weather.temp_max > 30)      mm *= 1.3;
    else if (weather.temp_max > 25) mm *= 1.15;

    // Pluie → réduit ou annule
    if (weather.precip >= 10) return { skip: true, reason: "precip", precip: weather.precip };
    if (weather.precip > 5)   mm = Math.max(0, mm - weather.precip * 0.8);
    else if (weather.precip > 2) mm = Math.max(0, mm - weather.precip * 0.5);

    // Humidité élevée → réduit
    if (weather.humidity > 80) mm *= 0.85;

    // Vent fort → évaporation accrue
    if (weather.wind > 30) mm *= 1.1;
  }

  mm = Math.round(mm * 10) / 10;

  // Seuil minimum
  if (mm < 2) return { skip: true, reason: "precip_partial" };

  // Durée = dose ÷ débit × 60 min
  const minutes = Math.round((mm / debitMmH) * 60);

  return { mm, minutes, freq, debitMmH, intervalHeures };
}

// ─────────────────────────────────────────────────────────────────────────────
// ARROSAGE SEMIS (germination) — calcul dynamique basé sur l'ET₀
// ─────────────────────────────────────────────────────────────────────────────
// Pendant la germination, la surface doit rester constamment humide : petites
// doses fréquentes (micro-arrosages), pas un arrosage profond espacé.
//
// Logique agronomique (déficit hydrique de surface) :
//   déficit = (ET₀ − pluie_du_jour) × coef_type
//     coef : création ×1.2 (sol nu s'assèche plus vite), regarnissage ×1.0
//   nombre de micro-arrosages selon le déficit (mm) :
//     ≤ 0 → 0  |  0-2 → 1  |  2-4 → 2  |  4-6 → 3  |  > 6 → 4   (plafond 4)
//   dose/arrosage = déficit ÷ nombre, bornée entre 2 et 4 mm (petites doses)
//   durée/arrosage = dose ÷ débit × 60 (minutes)
//
// Premium uniquement (nécessite l'ET₀ Open-Meteo). Si ET₀ absente → skip
// (le front affichera la consigne texte simple pour les gratuits).
export function calcArrosageSemis({ et0, precip = 0, type = "creation", debitMmH = DEBIT_DEFAULT_MMH }) {
  // ET₀ indispensable (donnée Premium). Absente → pas de calcul dynamique.
  if (et0 === null || et0 === undefined || isNaN(et0)) {
    return { skip: true, raison: "et0_absent" };
  }

  const coef = type === "regarnissage" ? 1.0 : 1.2;
  const pluie = (typeof precip === "number" && !isNaN(precip)) ? precip : 0;
  const deficit = Math.max(0, (et0 - pluie)) * coef;

  // Nombre de micro-arrosages selon le déficit (plafond strict à 4)
  let nombre;
  if (deficit <= 0)      nombre = 0;
  else if (deficit <= 2) nombre = 1;
  else if (deficit <= 4) nombre = 2;
  else if (deficit <= 6) nombre = 3;
  else                   nombre = 4;

  // Déficit couvert par la pluie → aucun arrosage nécessaire aujourd'hui
  if (nombre === 0) {
    return { nombre: 0, doseMm: 0, minutes: 0,
      deficit: Math.round(deficit * 10) / 10, et0, precip: pluie };
  }

  // Dose par micro-arrosage = déficit ÷ nombre, bornée entre 2 et 4 mm
  let dose = deficit / nombre;
  dose = Math.max(2, Math.min(4, dose));
  dose = Math.round(dose * 10) / 10;

  // Durée par micro-arrosage
  const minutes = Math.max(1, Math.round((dose / debitMmH) * 60));

  return {
    nombre,
    doseMm: dose,
    minutes,
    deficit: Math.round(deficit * 10) / 10,
    et0,
    precip: pluie,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VOLUME DE SEMENCES — calcul indicatif selon la surface du profil
// ─────────────────────────────────────────────────────────────────────────────
// Doses standard : Création 35 g/m² · Regarnissage 25 g/m².
// Marge de sécurité +10% (bordures, reprises, pertes).
// Format lisible : grammes sous 1 kg, kilos au-dessus (1 décimale, virgule FR).
// Retourne { ok, minTxt, maxTxt, doseGm, surface } ou { ok:false } si surface absente.
export const DOSE_SEMIS = { creation: 35, regarnissage: 25 }; // g/m²

function formatMasseSemis(grammes) {
  if (grammes < 1000) return `${Math.round(grammes)} g`;
  const kg = grammes / 1000;
  return `${(Math.round(kg * 10) / 10).toString().replace(".", ",")} kg`;
}

export function calcSemences(surface, type = "creation") {
  const s = Number(surface);
  if (!s || isNaN(s) || s <= 0) return { ok: false };
  const dose = type === "regarnissage" ? DOSE_SEMIS.regarnissage : DOSE_SEMIS.creation;
  const base = s * dose;          // grammes
  const avecMarge = base * 1.1;   // +10%
  return {
    ok: true,
    surface: s,
    doseGm: dose,
    minTxt: formatMasseSemis(base),
    maxTxt: formatMasseSemis(avecMarge),
  };
}

export function getWMO(code) {
  if (code === 0) return { label:"Ciel dégagé", icon:"☀️" };
  if (code <= 3)  return { label:"Partiellement nuageux", icon:"⛅" };
  if (code <= 49) return { label:"Brouillard", icon:"🌫️" };
  if (code <= 59) return { label:"Bruine", icon:"🌦️" };
  if (code <= 69) return { label:"Pluie", icon:"🌧️" };
  if (code <= 79) return { label:"Neige", icon:"❄️" };
  if (code <= 84) return { label:"Averses", icon:"🌦️" };
  if (code <= 99) return { label:"Orages", icon:"⛈️" };
  return { label:"Variable", icon:"🌡️" };
}

export function computeAlerts(days) {
  const alerts = [];
  if (!days?.length) return alerts;
  const d = days[0];
  if (d.temp_min <= 2)  alerts.push({ type:"danger",  msg:"⚠️ Risque de gel cette nuit — ne pas marcher sur le gazon !" });
  if (d.temp_max >= 33) alerts.push({ type:"warning", msg:"🔥 Canicule — arrosage renforcé, éviter la tonte" });
  if (d.precip >= 8)    alerts.push({ type:"info",    msg:"🌧️ Forte pluie prévue — arrosage inutile aujourd'hui" });
  if (d.wind >= 40)     alerts.push({ type:"warning", msg:"💨 Vents forts — reporter la tonte" });
  const gelProchain = days.slice(1,3).some(x => x.temp_min <= 0);
  if (gelProchain && !alerts.find(a => a.msg.includes("gel")))
    alerts.push({ type:"info", msg:"❄️ Gel prévu dans les 3 prochains jours" });
  return alerts;
}
