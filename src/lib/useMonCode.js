// src/lib/useMonCode.js
// Code de parrainage de l'utilisateur connecté (api/parrainage.cjs, action « mon-code »), ajouté aux partages du score et
// du quiz : l'ami qui s'inscrit avec ce code a 1 mois de Premium offert (décision de Jordan du 31/10/2026, CGV 7 ter).
// null tant qu'il n'est pas chargé ou s'il est indisponible : les partages gardent alors le lien simple.
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { appelParrainage } from "./codeParrainage";

export function useMonCode(actif = true) {
  const { getToken, isSignedIn } = useAuth();
  const jeton = useRef(getToken); // fonction de Clerk lue à l'appel : pas de nouvel appel à chaque rendu
  jeton.current = getToken;
  const [info, setInfo] = useState(null);
  useEffect(() => {
    if (!actif || !isSignedIn) return undefined;
    let vivant = true;
    appelParrainage(() => jeton.current(), { action: "mon-code" })
      .then(i => { if (vivant && i?.code) setInfo({ code: i.code, lien: i.lien }); })
      .catch(() => {});
    return () => { vivant = false; };
  }, [actif, isSignedIn]);
  return info;
}
