// src/lib/useLigueHiver.js
// Participations à la ligue d'hiver (POST /api/send?type=ligue, api/ligueHiver.cjs) : état de la saison (semaine en cours,
// défis et quiz faits, points d'assiduité), validation du défi, début du quiz (chrono tenu par le serveur) et réponses.
// Chargé seulement pendant la période affichée de la ligue (periodeLigue).
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { periodeLigue } from "./ligueHiver";

export function useLigueHiver() {
  const { getToken, isSignedIn } = useAuth();
  const [etat, setEtat] = useState(null);
  const [erreur, setErreur] = useState("");
  const active = !!periodeLigue();
  const jeton = useRef(getToken); // fonction de Clerk lue à chaque appel : pas de nouveau chargement à chaque rendu
  jeton.current = getToken;

  const appeler = useCallback(async (corps) => {
    const token = await jeton.current();
    const r = await fetch("/api/send?type=ligue", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(corps),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `Ligue d'hiver indisponible (erreur ${r.status})`);
    setEtat(d);
    setErreur("");
    return d;
  }, []);

  useEffect(() => {
    if (isSignedIn && active) appeler({ action: "etat" }).catch(e => setErreur(e.message));
  }, [isSignedIn, active, appeler]);

  return {
    etat,
    erreur,
    faireDefi: (semaine) => appeler({ action: "defi", semaine }),
    demarrerQuiz: (semaine) => appeler({ action: "debut_quiz", semaine }),
    repondre: (semaine, reponses) => appeler({ action: "quiz", semaine, reponses }),
  };
}
