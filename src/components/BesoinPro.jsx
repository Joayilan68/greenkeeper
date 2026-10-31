// src/components/BesoinPro.jsx
// « Besoin d'un pro ? » sous le résultat du diagnostic (liste d'attente de « Trouver un pro », go de Jordan du 31/10/2026) :
// email du compte prérempli, code postal, travaux cochés d'après les problèmes détectés → POST /api/send?type=pro-attente
// (api/trouverUnPro.cjs, compte rattaché par le jeton Clerk) ; ouverture annoncée dans src/lib/trouverUnPro.json.
import { useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import SERVICES from "../lib/servicesPartenaires.json";
import TROUVER_UN_PRO from "../lib/trouverUnPro.json";
import { card, btn } from "../lib/styles";

const PROPOSES = ["regarnissage", "scarification", "traitements", "creation", "tonte"];
const champ = { width:"100%", boxSizing:"border-box", padding:"11px 12px", borderRadius:10, border:"1px solid rgba(165,214,167,0.3)",
  background:"rgba(255,255,255,0.06)", color:"#e8f5e9", fontSize:16, fontFamily:"inherit" };

export default function BesoinPro({ travauxDetectes = [] }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [ouvertLe, setOuvertLe] = useState(null);
  const [email, setEmail] = useState("");
  const [cp, setCp] = useState("");
  const [travaux, setTravaux] = useState(travauxDetectes);
  const [etat, setEtat] = useState({ envoi:false, erreur:"", fait:false });

  const ouvrir = () => { setEmail(user?.primaryEmailAddress?.emailAddress || ""); setOuvertLe(Date.now()); };
  const basculer = (t) => setTravaux(l => l.includes(t) ? l.filter(x => x !== t) : [...l, t]);

  const envoyer = async (e) => {
    e.preventDefault();
    if (!travaux.length) return setEtat({ envoi:false, erreur:"Coche au moins un type de travaux.", fait:false });
    setEtat({ envoi:true, erreur:"", fait:false });
    try {
      const token = await getToken();
      const r = await fetch("/api/send?type=pro-attente", { method:"POST",
        headers: { "Content-Type":"application/json", ...(token ? { Authorization:`Bearer ${token}` } : {}) },
        body: JSON.stringify({ email, code_postal: cp, travaux, source:"app", page:"diagnostic", duree: Date.now() - ouvertLe }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || "");
      setEtat({ envoi:false, erreur:"", fait:true });
    } catch (err) {
      setEtat({ envoi:false, erreur: err.message || "L'inscription n'a pas abouti. Réessaie dans un instant.", fait:false });
    }
  };

  return (
    <div data-carte="besoin-pro" style={{ ...card(), background:"rgba(249,168,37,0.08)", border:"1px solid rgba(249,168,37,0.35)" }}>
      <div style={{ fontSize:14, fontWeight:800, color:"#ffe082", marginBottom:4 }}>🧑‍🌾 Besoin d'un pro pour ces travaux ?</div>
      {etat.fait ? (
        <div style={{ fontSize:12.5, color:"#a5d6a7", lineHeight:1.6 }}>✅ C'est noté : on te prévient dès l'ouverture de « Trouver un pro ».</div>
      ) : (<>
        <div style={{ fontSize:12, color:"#a5d6a7", lineHeight:1.6, marginBottom:10 }}>
          « Trouver un pro » ouvre {TROUVER_UN_PRO.ouverture} : un paysagiste ou un jardinier de ton secteur. Laisse ton email, on te prévient à l'ouverture.
        </div>
        {!ouvertLe ? (
          <button onClick={ouvrir} style={{ ...btn.ghost, fontSize:14, padding:"12px" }}>Être prévenu</button>
        ) : (
          <form onSubmit={envoyer} style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Ton email" aria-label="Ton email"
              autoComplete="email" maxLength={120} style={champ} />
            <input required value={cp} onChange={e => setCp(e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="Code postal" aria-label="Code postal"
              inputMode="numeric" pattern="[0-9]{5}" autoComplete="postal-code" style={champ} />
            <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 14px", margin:"4px 0" }}>
              {PROPOSES.map(t => (
                <label key={t} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12.5, color:"#e8f5e9" }}>
                  <input type="checkbox" checked={travaux.includes(t)} onChange={() => basculer(t)} />{SERVICES[t]}
                </label>
              ))}
            </div>
            <button type="submit" disabled={etat.envoi} style={{ ...btn.primary, fontSize:14, padding:"12px", opacity: etat.envoi ? 0.6 : 1 }}>
              {etat.envoi ? "Envoi…" : "Être prévenu"}
            </button>
            {etat.erreur && <div role="alert" style={{ fontSize:12, color:"#ef9a9a" }}>{etat.erreur}</div>}
            <div style={{ fontSize:10.5, color:"#81c784", lineHeight:1.5 }}>
              Une confirmation maintenant, puis un email à l'ouverture, rien d'autre. Tes coordonnées ne sont jamais transmises à un pro sans ta demande.
            </div>
          </form>
        )}
      </>)}
    </div>
  );
}
