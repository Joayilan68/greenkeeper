import { useHistory } from "../lib/useHistory";
import { MONTHS_FR } from "../lib/lawn";
import { card, scroll, header } from "../lib/styles";

export default function History() {
  const { history, removeEntry } = useHistory();

  return (
    <div>
      <div style={header}>
        <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>Historique</div>
        <div style={{ fontSize:12, color:"#81c784", opacity:0.7, marginTop:4 }}>{history.length} intervention{history.length>1?"s":""} enregistrée{history.length>1?"s":""}</div>
      </div>
      <div style={scroll}>
        {history.length === 0 ? (
          <div style={{ ...card(), textAlign:"center", padding:40 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
            <div style={{ color:"#81c784", fontSize:14 }}>Aucune action journalisée</div>
            <div style={{ color:"#81c784", fontSize:12, opacity:0.6, marginTop:6 }}>Ajoutez vos interventions depuis "Aujourd'hui"</div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ ...card(), display:"flex", gap:8 }}>
              {[
                { val: history.length, label:"Total" },
                { val: history.filter(h=>h.action.includes("Tonte")).length, label:"Tontes" },
                { val: history.filter(h=>h.action.includes("Arrosage")).length, label:"Arrosages" },
              ].map(({ val, label }) => (
                <div key={label} style={{ flex:1, textAlign:"center", background:"rgba(255,255,255,0.05)", borderRadius:12, padding:"10px" }}>
                  <div style={{ fontSize:22, fontWeight:800, color:"#a5d6a7" }}>{val}</div>
                  <div style={{ fontSize:11, color:"#81c784" }}>{label}</div>
                </div>
              ))}
            </div>
            {history.map(h => (
              <div key={h.id} style={{ ...card(), padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{h.action}</div>
                  <div style={{ fontSize:11, color:"#81c784", marginTop:2 }}>{h.date} · {MONTHS_FR[h.month]}</div>
                </div>
                <button onClick={() => removeEntry(h.id)} style={{ background:"none", border:"none", color:"#ef9a9a", cursor:"pointer", fontSize:20, lineHeight:1 }}>×</button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
