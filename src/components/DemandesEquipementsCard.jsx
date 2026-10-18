// src/components/DemandesEquipementsCard.jsx
// Pilotage → Activité : équipements que les utilisateurs aimeraient connecter (formulaire anonyme de « Mes équipements »),
// du plus demandé au moins demandé ; sert à choisir les prochains connecteurs et à argumenter auprès des marques.
import { useState, useEffect } from "react";
import { card, cardTitle } from "../lib/styles";

const TYPES = { robot:"🤖 Robot", arrosage:"💧 Arrosage", station:"🌦️ Station", capteur:"🌱 Capteur", autre:"🔌 Autre" };

export default function DemandesEquipementsCard({ getToken }) {
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur]   = useState("");

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res   = await fetch("/api/stats?type=demandes_equipements", { headers: { Authorization: `Bearer ${token}` } });
        const data  = await res.json();
        if (!data.success) throw new Error(data.error || `HTTP ${res.status}`);
        setDonnees(data);
      } catch (e) { setErreur(e.message); }
    })();
  }, []); // eslint-disable-line

  return (
    <div style={card()}>
      <div style={cardTitle}><span>🙋 Équipements demandés</span><span style={{ fontSize:11, color:"#81c784" }}>{donnees ? `${donnees.total} demande${donnees.total > 1 ? "s" : ""}` : "…"}</span></div>
      {erreur && <div style={{ fontSize:12, color:"#ef9a9a" }}>❌ {erreur}</div>}
      {donnees && !donnees.demandes.length && <div style={{ fontSize:12, color:"#a5d6a7" }}>Aucune demande pour l'instant (formulaire en bas de « Mes équipements »).</div>}
      {donnees?.demandes.map(d => (
        <div key={`${d.type}-${d.marque}`} style={{ display:"flex", justifyContent:"space-between", gap:8, padding:"6px 0", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#e8f5e9" }}>{TYPES[d.type]} · {d.marque}</div>
            {d.modeles.length > 0 && <div style={{ fontSize:11, color:"#81c784", overflowWrap:"anywhere" }}>{d.modeles.join(", ")}</div>}
          </div>
          <div style={{ fontSize:13, fontWeight:800, color:"#a5d6a7", whiteSpace:"nowrap" }}>{d.nombre}</div>
        </div>
      ))}
    </div>
  );
}
