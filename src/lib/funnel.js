// src/lib/funnel.js
// ────────────────────────────────────────────────────────────────────────────
// SUIVI D'ENTONNOIR (funnel) — écrit dans Supabase `funnel_events` via la clé
// anon (comme pingVisit). Aucune fonction serveur → reste sous le plafond des
// 12 fonctions Vercel. Non bloquant : si l'insert échoue, ça ne casse rien.
//
// Étapes suivies :
//   • landing_view      → un prospect (non connecté) voit l'accueil visiteur
//   • cta_click         → il clique sur un bouton d'action (avec la source)
//   • auth_screen_view  → il arrive sur l'écran compte (inscription / connexion)
//   • signup_completed  → il a créé son compte (nouvel utilisateur)
//   • page_view, tuile  → mesure d'usage des pages et des tuiles (voir mesure.js)
//   • premium_souscrit  → abonnement payant pris (écrit par le webhook Stripe, api/webhook.js)
//   • conseils_vue      → page Conseils lue (écrit par les pages Conseils, scripts/conseils-template.mjs)
//
// Les vues (landing_view, auth_screen_view) sont limitées à 1 par SESSION de
// navigateur pour que l'entonnoir soit comparable étape par étape. Les clics
// ne sont pas dédupliqués (ce sont des actions volontaires).
//
// Chaque ligne porte un identifiant de visite (colonne « visite ») tiré au hasard et gardé dans l'onglet le temps
// de la visite (sessionStorage, effacé à sa fermeture) : il relie les étapes d'une même visite pour compter des
// visiteurs distincts (vue funnel_visites_30j), sans cookie ni lien avec un compte (décision du 26/10/2026).
// ────────────────────────────────────────────────────────────────────────────

import { isRobot } from "./platform";

function idVisite() {
  try {
    let id = sessionStorage.getItem("mg360_visite");
    if (!id) {
      id = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem("mg360_visite", id);
    }
    return id;
  } catch { return null; } // stockage de session indisponible : ligne comptée sans visite
}

export function trackFunnel(step, meta) {
  if (isRobot()) return; // robots d'indexation : pas des prospects
  try {
    import("./supabase").then(({ supabase }) => {
      supabase.from("funnel_events")
        .insert({
          step,
          meta: meta || null,
          path: typeof location !== "undefined" ? location.pathname : null,
          visite: idVisite(),
        })
        .then(() => {}, () => {});
    }).catch(() => {});
  } catch { /* non bloquant */ }
}

// Variante « une fois par session » (pour les vues d'écran).
export function trackFunnelOncePerSession(step, meta) {
  try {
    const key = `mg360_funnel_${step}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch { /* si sessionStorage indispo, on log quand même une fois */ }
  trackFunnel(step, meta);
}
