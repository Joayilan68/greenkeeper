// src/lib/useEquipements.js
// Équipements connectés de l'utilisateur (api/objets.js) : station météo, robot tondeuse.
// Partagé par « Mes équipements » et la carte du robot dans « Aujourd'hui ».
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";

export function useEquipements(actif = true) {
  const { getToken } = useAuth();
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const appel = useCallback(async (options) => {
    const r = await fetch("/api/objets", { ...options, headers: { "Content-Type":"application/json", Authorization:`Bearer ${await getToken()}` } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Erreur, réessaie plus tard");
    return d;
  }, [getToken]);

  const charger = useCallback(() => appel({ method:"GET" }).then(setDonnees).catch(e => setErreur(e.message)), [appel]);
  useEffect(() => { if (actif) charger(); }, [actif, charger]);

  // Action POST ; renvoie la réponse (ou null en cas d'erreur, affichée via « erreur »)
  const action = useCallback(async (corps) => {
    setErreur(""); setEnvoi(true);
    try { return await appel({ method:"POST", body: JSON.stringify(corps) }); }
    catch (e) { setErreur(e.message); return null; }
    finally { setEnvoi(false); }
  }, [appel]);

  return { donnees, erreur, setErreur, envoi, charger, action };
}
