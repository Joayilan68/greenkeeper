// src/components/HistoriqueActions.jsx
// Mon gazon → historique des actions journalisées depuis « Aujourd'hui » (refonte : remplace la page /history) ;
// les 5 dernières, puis tout l'historique à la demande ; une action notée par erreur se retire.
import { useState } from "react";
import { MONTHS_FR } from "../lib/lawn";
import { card } from "../lib/styles";

export default function HistoriqueActions({ history = [], removeEntry }) {
  const [tout, setTout] = useState(false);
  const affichees = tout ? history : history.slice(0, 5);

  return (
    <div data-tuile="mongazon-historique" style={{ ...card(), padding:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <span style={{ fontWeight:700, color:"#66BB6A", fontSize:14 }}>📋 Mes actions</span>
        <span style={{ fontSize:11, color:"#81c784" }}>{history.length} enregistrée{history.length > 1 ? "s" : ""}</span>
      </div>
      {history.length === 0 ? (
        <div style={{ fontSize:12, color:"#81c784", lineHeight:1.5 }}>Aucune action notée pour l'instant : valide tes actions depuis « Aujourd'hui ».</div>
      ) : (
        <>
          {affichees.map(h => (
            <div key={h.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 10px", marginBottom:6, background:"rgba(255,255,255,0.05)", borderRadius:10 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:13 }}>{h.action}</div>
                <div style={{ fontSize:11, color:"#81c784", marginTop:2 }}>{h.date} · {MONTHS_FR[h.month]}</div>
              </div>
              <button onClick={() => removeEntry(h.id)} aria-label={`Retirer ${h.action} du ${h.date}`} style={{ background:"none", border:"none", color:"#ef9a9a", cursor:"pointer", fontSize:20, lineHeight:1, padding:"0 4px" }}>×</button>
            </div>
          ))}
          {history.length > 5 && (
            <button onClick={() => setTout(!tout)} style={{ width:"100%", background:"none", border:"1px solid rgba(165,214,167,0.25)", borderRadius:10, padding:"8px", color:"#a5d6a7", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              {tout ? "Voir moins" : `Voir tout l'historique (${history.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
