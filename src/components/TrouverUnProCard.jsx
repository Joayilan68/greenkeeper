// src/components/TrouverUnProCard.jsx
// Pilotage → Activité : « Trouver un pro », particuliers en liste d'attente (encart « Besoin d'un pro ? ») et demandes des
// pros (page /partenaires), par département ; sert à choisir où recruter et à argumenter auprès des pros.
import { useState, useEffect } from "react";
import { card, cardTitle } from "../lib/styles";
import SERVICES from "../lib/servicesPartenaires.json";

export default function TrouverUnProCard({ getToken }) {
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur]   = useState("");

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res   = await fetch("/api/stats?type=trouver_un_pro", { headers: { Authorization: `Bearer ${token}` } });
        const data  = await res.json();
        if (!data.success) throw new Error(data.error || `HTTP ${res.status}`);
        setDonnees(data);
      } catch (e) { setErreur(e.message); }
    })();
  }, []); // eslint-disable-line

  const travaux = donnees ? Object.entries(donnees.travaux).sort((a, b) => b[1] - a[1]) : [];
  return (
    <div style={card()}>
      <div style={cardTitle}><span>🧑‍🌾 Trouver un pro</span>
        <span style={{ fontSize:11, color:"#81c784" }}>{donnees ? `${donnees.particuliers} en attente · ${donnees.pros} pro${donnees.pros > 1 ? "s" : ""}` : "…"}</span></div>
      {erreur && <div style={{ fontSize:12, color:"#ef9a9a" }}>❌ {erreur}</div>}
      {donnees && !donnees.departements.length && <div style={{ fontSize:12, color:"#a5d6a7" }}>Aucune inscription ni demande de pro pour l'instant.</div>}
      {donnees?.departements.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:"4px 14px", fontSize:12, alignItems:"baseline" }}>
          <span style={{ color:"#81c784" }}>Département</span><span style={{ color:"#81c784" }}>Particuliers</span><span style={{ color:"#81c784" }}>Pros</span>
          {donnees.departements.map(d => [
            <span key={`${d.departement}-d`} style={{ color:"#e8f5e9", fontWeight:700 }}>{d.departement}</span>,
            <span key={`${d.departement}-p`} style={{ color:"#a5d6a7", fontWeight:800, textAlign:"right" }}>{d.particuliers}</span>,
            <span key={`${d.departement}-r`} style={{ color:"#a5d6a7", textAlign:"right" }}>{d.pros}{d.prosAcceptes ? ` (${d.prosAcceptes} ✓)` : ""}</span>,
          ])}
        </div>
      )}
      {travaux.length > 0 && (
        <div style={{ fontSize:11, color:"#81c784", marginTop:10, lineHeight:1.6 }}>
          Travaux demandés : {travaux.map(([t, n]) => `${SERVICES[t] || t} (${n})`).join(" · ")}
        </div>
      )}
    </div>
  );
}
