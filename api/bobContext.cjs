// api/bobContext.cjs
// Dossier de l'utilisateur lu par Bob avant de répondre (api/ai-assistant.js), construit côté serveur :
// profil et équipement, dernières actions, dernier diagnostic photo, parcours en cours, météo des 5 jours
// (température du sol et évaporation pour Premium). Texte compact pour limiter les jetons.

const { currentPhase } = require("./parcoursEngine.cjs");

const DIAG_MAX_JOURS = 60; // un diagnostic plus ancien ne décrit plus l'état actuel
// Valeurs stockées sans accents → libellés lisibles
const LIBELLES = { elevee: "élevée", ensoleille: "ensoleillé", ombrage: "ombragé", electrique_batterie: "électrique sur batterie",
  electrique_filaire: "électrique filaire", thermique: "thermique", robot: "robot", naturel: "naturel", parfait: "parfait" };
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
  l.push(`Ville : ${p.ville || "?"} · objectif : ${lisible(p.objectif) || "?"} · usages : ${lisible(p.usages) || "?"}`);
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
