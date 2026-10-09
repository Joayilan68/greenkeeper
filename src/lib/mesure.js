// src/lib/mesure.js
// Mesure d'usage anonyme des pages et des tuiles, pour décider de la refonte de décembre 2026 (décision du 09/10/2026).
// Une ligne par page ouverte (« page_view ») et par tuile touchée (« tuile », repérée par l'attribut data-tuile) dans
// `funnel_events`, sans identifiant d'utilisateur, avec le niveau d'accès. Comptes admin non mesurés.
// Couvert par la politique de confidentialité (mesure d'audience anonyme sans cookie).

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackFunnel } from "./funnel";

// niveau : "visiteur", "gratuit" ou "premium" ; null tant qu'il n'est pas connu, et pour un admin
export function useMesureUsage(niveau) {
  const { pathname } = useLocation();
  const dernierePage = useRef(null);

  useEffect(() => {
    if (!niveau || dernierePage.current === pathname) return;
    dernierePage.current = pathname;
    trackFunnel("page_view", { niveau });
  }, [pathname, niveau]);

  useEffect(() => {
    if (!niveau) return;
    const clic = (e) => {
      const tuile = e.target instanceof Element ? e.target.closest("[data-tuile]") : null;
      if (tuile) trackFunnel("tuile", { tuile: tuile.dataset.tuile, niveau });
    };
    document.addEventListener("click", clic, true);
    return () => document.removeEventListener("click", clic, true);
  }, [niveau]);
}
