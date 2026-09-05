// src/lib/funnel.js
// ────────────────────────────────────────────────────────────────────────────
// SUIVI D'ENTONNOIR (funnel) — écrit dans Supabase `funnel_events` via la clé
// anon (comme pingVisit). Aucune fonction serveur → reste sous le plafond des
// 12 fonctions Vercel. Non bloquant : si l'insert échoue, ça ne casse rien.
//
// Étapes suivies :
//   • landing_view      → un prospect (non connecté) voit la page de présentation
//   • cta_click         → il clique sur un bouton d'action (avec la source)
//   • auth_screen_view  → il arrive sur l'écran compte (inscription / connexion)
//   • signup_completed  → il a créé son compte (nouvel utilisateur)
//
// Les vues (landing_view, auth_screen_view) sont limitées à 1 par SESSION de
// navigateur pour que l'entonnoir soit comparable étape par étape. Les clics
// ne sont pas dédupliqués (ce sont des actions volontaires).
// ────────────────────────────────────────────────────────────────────────────

export function trackFunnel(step, meta) {
  try {
    import("./supabase").then(({ supabase }) => {
      supabase.from("funnel_events")
        .insert({
          step,
          meta: meta || null,
          path: typeof location !== "undefined" ? location.pathname : null,
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
