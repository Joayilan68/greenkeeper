// api/bobContext.cjs
// Dossier de l'utilisateur lu par Bob avant de répondre (api/ai-assistant.js), construit côté serveur :
// profil, zone climatique, hauteurs de tonte et arrosage selon le sol (base de connaissances), équipement et dépenses gazon de l'année,
// dernières actions, dernier diagnostic photo, parcours en cours, météo des 5 jours (température du sol et
// évaporation pour Premium). Texte compact pour limiter les jetons.

const { currentPhase, zoneFromLatLon, ZONES } = require("./parcoursEngine.cjs");
const TONTE_GAZON = require("../src/lib/tonteGazon.json");

const DIAG_MAX_JOURS = 60; // un diagnostic plus ancien ne décrit plus l'état actuel
// Valeurs stockées sans accents → libellés lisibles
const LIBELLES = { elevee: "élevée", ensoleille: "ensoleillé", ombrage: "ombragé", electrique_batterie: "électrique sur batterie",
  electrique_filaire: "électrique filaire", thermique: "thermique", robot: "robot", naturel: "naturel", parfait: "parfait" };
// Base de connaissances Mongazon360 (docs/kb) — onglet « Fenêtres Semis par Zone » : note agronomique et
// contraintes de chaque zone ; onglet « Gazons Spécifiques » : bermuda déconseillé en Nord-Est
const CLIMATS = {
  nord_est:  "semi-continental : printemps tardif, automne court mais fiable ; contraintes : canicule juil.-août, gel dès novembre ; semis à privilégier en automne ; bermuda déconseillé",
  nord:      "été doux, refroidissement rapide en automne ; contraintes : chaleur juil.-août, gel précoce en novembre ; semis à privilégier en automne",
  ouest:     "océanique doux et humide : large fenêtre de semis, surveiller les maladies fongiques (excès d'humidité) ; contraintes : sécheresse possible en août, gel rare ; semis à privilégier en automne (fenêtre longue)",
  centre:    "tempéré : deux fenêtres de semis équilibrées ; contraintes : sécheresse juil.-août, gel déc.-janv. ; semis au printemps et à l'automne",
  sud_ouest: "sol qui se réchauffe tôt (printemps précoce), automne long et favorable ; contraintes : chaleur et sécheresse dès juin, hiver doux ; semis à privilégier en automne, jamais l'été",
  sud:       "méditerranéen : semer avant la chaleur ou en automne, jamais l'été (canicule = échec) ; contraintes : canicule mai→sept., hiver très doux ; semis à privilégier en automne (fenêtre très longue)",
  corse:     "méditerranéen insulaire : automne privilégié, arrosage indispensable au printemps ; contraintes : sécheresse marquée l'été, hiver doux",
};
// Onglet « Arrosage Précis » : volume par session, fréquence et heure selon le sol
const ARROSAGE = {
  sableux: "15-20 mm tous les 2-3 jours, quotidien en canicule, 5h-7h le matin obligatoirement",
  limoneux: "10-15 mm tous les 3-4 jours, tous les 2 jours en canicule, 5h-8h le matin (soir déconseillé : champignons)",
  argileux: "8-12 mm en 2 passages tous les 4-5 jours, tous les 3 jours en canicule, 6h-8h le matin (soir interdit)",
  calcaire: "10-14 mm tous les 3-4 jours, tous les 2-3 jours en canicule, 5h-8h le matin",
  humifere: "8-10 mm tous les 4-5 jours, tous les 3 jours en canicule, 5h-8h le matin",
  compacte: "6-8 mm en 2 passages tous les 3-4 jours après aération, 6h-8h le matin (soir interdit)",
};
// Onglet « Tonte Précise » (src/lib/tonteGazon.json, partagé avec le plan de printemps) : hauteurs (cm)
// printemps / été / canicule / automne et minimum absolu, par type de gazon
const TONTE = Object.fromEntries(Object.entries(TONTE_GAZON.types).map(([type, t]) =>
  [type, `${t.printemps} / ${t.ete} / ${t.canicule} / ${t.automne}, jamais sous ${t.min}${t.note ? ` ; ${t.note}` : ""}`]));

// Plafond de chaque tranche de budget du profil (même règle que src/lib/depenses.js)
const PLAFONDS = { "0-50": 50, "50-150": 150, "150-300": 300, "300-600": 600 };
const euros = (n) => { const v = Math.round(n * 100) / 100; return `${Number.isInteger(v) ? v : v.toFixed(2).replace(".", ",")} €`; };
const lisible = (v) => Array.isArray(v) ? v.map(lisible).filter(Boolean).join(", ")
  : v ? (LIBELLES[v] || String(v).replace(/_/g, " ")) : "";

async function meteo(profile, premium) {
  const { lat, lon } = profile || {};
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  try {
    const base = process.env.SELF_BASE_URL || "https://mongazon360.fr";
    const r = await fetch(`${base}/api/weather?lat=${lat}&lon=${lon}${premium ? "&premium=true" : ""}`,
      { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const d = (await r.json()).daily || {};
    return (d.time || []).slice(0, 5).map((jour, i) => {
      const val = (k, n = 0) => typeof d[k]?.[i] === "number" ? Number(d[k][i].toFixed(n)) : null;
      const parts = [`${jour.slice(8, 10)}/${jour.slice(5, 7)}`, `${val("temperature_2m_min")}/${val("temperature_2m_max")}°C`,
        `pluie ${val("precipitation_sum", 1)} mm`, `vent ${val("windspeed_10m_max")} km/h`];
      if (premium && val("soil_temp", 1) !== null) parts.push(`sol ${val("soil_temp", 1)}°C`);
      if (premium && val("et0", 1) !== null) parts.push(`évaporation ${val("et0", 1)} mm`);
      return parts.join(", ");
    });
  } catch { return null; }
}

async function buildBobContext(supabase, { userId, premium, clientProfile = {}, score, month }) {
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: prof }, { data: hist }, { data: diags }, { data: parcours }] = await Promise.all([
    supabase.from("profiles").select("data").eq("user_id", userId).maybeSingle(),
    supabase.from("histories").select("action, date").eq("user_id", userId).order("created_at", { ascending: false }).limit(12),
    supabase.from("diagnostics").select("created_at, etat_general, score_visuel, problemes, actions_urgentes")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(1),
    supabase.from("parcours").select("type, statut, date_semis, date_prevue")
      .eq("user_id", userId).in("statut", ["actif", "en_attente_fenetre"]).limit(1),
  ]);
  const p = prof?.data || clientProfile || {};
  const MOIS = ["", "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const l = [];

  l.push(`Date du jour : ${today.split("-").reverse().join("/")} (${MOIS[month] || ""}) · Score de santé du gazon dans l'app : ${score}/100`);
  l.push(`Gazon : ${lisible(p.pelouse) || "non renseigné"} · sol : ${lisible(p.sol) || "?"} · surface : ${p.surface ? p.surface + " m²" : "?"} · exposition : ${lisible(p.exposition) || "?"}`);
  if (typeof p.lat === "number" && typeof p.lon === "number") {
    const cle = zoneFromLatLon(p.lat, p.lon);
    l.push(`Zone climatique ${ZONES[cle].label} : ${CLIMATS[cle]}`);
  }
  const sol = String(p.sol || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (ARROSAGE[sol]) l.push(`Arrosage pour son sol (${lisible(p.sol)}) : ${ARROSAGE[sol]}`);
  const typeTonte = TONTE_GAZON.alias[p.pelouse];
  if (typeTonte) l.push(`Hauteurs de tonte de son gazon (${typeTonte}) — printemps / été / canicule / automne en cm : ${TONTE[typeTonte]}`);
  l.push(`Ville : ${p.ville || "?"} · objectif : ${lisible(p.objectif) || "?"} · usages : ${lisible(p.usages) || "?"}`);
  const GAMME = { "0-50": "eco", inconnu: "eco", "50-150": "standard", "150-300": "qualite", "300-600": "premium", "600+": "premium" };
  if (p.budget) l.push(`Budget entretien annuel : ${p.budget === "inconnu" ? "non précisé" : p.budget + " €"} (gamme de produits conseillée : ${GAMME[p.budget] || "standard"})`);
  const annee = today.slice(0, 4);
  const achats = (Array.isArray(p.achats) ? p.achats : []).filter(a => a.date?.startsWith(annee));
  const plafond = PLAFONDS[p.budget];
  if (achats.length) {
    const total = Math.round(achats.reduce((t, a) => t + (Number(a.prix) || 0), 0) * 100) / 100;
    const bilan = plafond ? (total > plafond ? `, budget de ${plafond} € dépassé de ${euros(total - plafond)}` : `, reste ${euros(plafond - total)} sur le budget de ${plafond} €`) : "";
    l.push(`Dépenses gazon notées dans l'app en ${annee} : ${euros(total)}${bilan}. Détail : ` +
      achats.slice(-12).map(a => `${a.date.slice(8, 10)}/${a.date.slice(5, 7)} ${a.label} ${euros(a.prix)}`).join(" · "));
  } else if (plafond) {
    l.push(`Aucune dépense gazon notée dans l'app en ${annee} (budget de ${plafond} €).`);
  }
  l.push(`Équipement : tondeuse ${lisible(p.tondeuse) || "?"} · arrosage ${lisible(p.arrosage) || "?"} · matériel ${lisible(p.materiel) || "?"}`);

  l.push(hist?.length
    ? `Dernières actions notées dans l'app : ${hist.map(h => `${h.date} ${h.action}`).join(" · ")}`
    : "Aucune action d'entretien notée dans l'app.");

  const diag = diags?.[0];
  const ageDiag = diag ? Math.floor((Date.now() - new Date(diag.created_at).getTime()) / 86400000) : null;
  if (diag && ageDiag <= DIAG_MAX_JOURS) {
    const pbs = (Array.isArray(diag.problemes) ? diag.problemes : []).map(x => `${x.nom}${x.severite ? ` (${lisible(x.severite)})` : ""}`).join(", ");
    const urg = (Array.isArray(diag.actions_urgentes) ? diag.actions_urgentes : []).join(" ; ");
    l.push(`Dernier diagnostic photo (il y a ${ageDiag} j) : état ${diag.etat_general || "?"}, score visuel ${diag.score_visuel ?? "?"}/100` +
      `${pbs ? ` · problèmes : ${pbs}` : ""}${urg ? ` · actions urgentes : ${urg}` : ""}`);
  } else {
    l.push("Pas de diagnostic photo récent.");
  }

  const pc = parcours?.[0];
  if (pc?.statut === "actif") {
    const ph = currentPhase({ type: pc.type, dateSemis: pc.date_semis, today });
    if (ph && !ph.termine) l.push(`Parcours ${pc.type} en cours : J${ph.jour}, phase « ${ph.nom} » · consigne : ${ph.action} · arrosage : ${ph.arrosage}`);
  } else if (pc?.statut === "en_attente_fenetre") {
    l.push(`Parcours ${pc.type} prévu, en attente de la bonne fenêtre de semis${pc.date_prevue ? ` (date visée ${pc.date_prevue})` : ""}.`);
  }

  const m = await meteo(p, premium);
  l.push(m?.length ? `Météo des 5 prochains jours : ${m.join(" | ")}` : "Météo : non disponible.");

  return l.map(x => `- ${x}`).join("\n");
}

module.exports = { buildBobContext };
