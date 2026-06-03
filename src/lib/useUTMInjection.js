// src/lib/useUTMInjection.js
// ─────────────────────────────────────────────────────────────────────────────
// Hook qui injecte les UTM captés au premier mount d'un user authentifié.
// Stratégie FIRST-TOUCH : on n'écrase JAMAIS les UTM déjà présents.
//
// Cycle de vie :
//   1. useUTMCapture stocke les UTM en sessionStorage à l'arrivée sur le site
//   2. User passe par Clerk SignIn/SignUp
//   3. User revient sur l'app, useUser() le renvoie
//   4. Ce hook vérifie : si user.unsafeMetadata.source n'existe pas encore
//      → lecture sessionStorage → user.update({ unsafeMetadata: {...} })
//      → nettoyage sessionStorage
//   5. Sur les visites suivantes du même user : ne fait rien (first-touch)
//
// Stocké dans Clerk unsafeMetadata (clé "source") car :
//   - unsafeMetadata est modifiable côté client (publicMetadata = backend only)
//   - Le user peut lire/écrire ses propres metadata
//   - Visible dans l'API Clerk pour les stats Pilotage
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { getCapturedUTM, clearCapturedUTM } from "./useUTMCapture";

export function useUTMInjection() {
  const { user, isLoaded } = useUser();
  const injected = useRef(false);

  useEffect(() => {
    // Conditions pour tenter l'injection
    if (!isLoaded) return;
    if (!user)     return;
    if (injected.current) return;

    // ✅ FIRST-TOUCH : si le user a déjà une source enregistrée, on ne touche pas
    const existingSource = user.unsafeMetadata?.source;
    if (existingSource) {
      // Nettoyer le sessionStorage au passage (plus besoin)
      clearCapturedUTM();
      injected.current = true;
      console.log("[MG360 UTM] First-touch déjà enregistré:", existingSource);
      return;
    }

    // Lire les UTM captés
    const utm = getCapturedUTM();

    // Si c'est "direct" sans referer ni campaign, on enregistre quand même
    // (la valeur "direct" est une info en soi : signup non attribué à une campagne)

    (async () => {
      try {
        await user.update({
          unsafeMetadata: {
            ...(user.unsafeMetadata || {}),
            source:        utm.source,
            medium:        utm.medium    || "",
            campaign:      utm.campaign  || "",
            referer:       utm.referer   || "",
            landingPath:   utm.landingPath || "",
            utmCapturedAt: utm.capturedAt || new Date().toISOString(),
          },
        });

        clearCapturedUTM();
        injected.current = true;

        console.log("[MG360 UTM] First-touch enregistré:", utm.source, utm);
      } catch (e) {
        console.warn("[MG360 UTM] Échec injection metadata Clerk:", e.message);
        // Pas de retry — on n'écrasera jamais en first-touch
        injected.current = true;
      }
    })();
  }, [isLoaded, user]); // eslint-disable-line
}
