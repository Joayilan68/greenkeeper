import { useNavigate } from "react-router-dom";
import { useHistory } from "../lib/useHistory";
import { MONTHLY_PLAN, MONTHS_FR } from "../lib/lawn";
import { card, cardTitle, btn, scroll, header } from "../lib/styles";

export default function free() {
  const navigate = useNavigate();
  const { history, addEntry, removeEntry } = useHistory();
  const today = new Date();
  const month = today.getMonth() + 1;
  const plan = MONTHLY_PLAN[month];
  const canLog = history.length < 5;
  const ACTIONS = ["Tonte ✂️","Arrosage 💧","Engrais 🌱","Verticut 🔧","Aération 🌀","Désherbage 🪴"];

  return (
    <div>
      <div style={header}>
        <div style={{fontSize:36}}>🌿</div>
        <div style={{fontSize:20,fontWeight:800,color:"#a5d6a7",marginTop:4}}>Accès Gratuit</div>
        <div style={{fontSize:12,color:"#81c784",marginTop:4}}>Fonctionnalités de base disponibles</div>
      </div>
      <div style={scroll}>
        {/* Plan mensuel */}
        <div style={card()}>
          <div style={cardTitle}><span>📅 {MONTHS_FR[month]} — {plan.label}</span></div>
          {[
            {icon:"✂️",label:"Tonte",val:plan.tonte},
            {icon:"🌱",label:"Engrais",val:plan.engrais||"Aucun ce mois"},
            {icon:"🔧",label:"Verticut",val:plan.verticut?"À prévoir":"Non requis"},
            {icon:"🌀",label:"Aération",val:plan.aeration?"Recommandée":"Non requise"},
          ].map(({icon,label,val}) => (
            <div key={label} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
              <span style={{fontSize:16,minWidth:24}}>{icon}</span>
              <div>
                <div style={{fontSize:11,color:"#81c784",fontWeight:700}}>{label}</div>
                <div style={{fontSize:13}}>{val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Historique limité */}
        <div style={card()}>
          <div style={cardTitle}>
            <span>✅ Mes interventions</span>
            <span style={{fontSize:11,color:"#f9a825"}}>{history.length}/5 entrées</span>
          </div>
          {!canLog ? (
            <div style={{textAlign:"center",padding:"12px 0"}}>
              <div style={{fontSize:13,color:"#81c784",marginBottom:12}}>🔒 Limite atteinte — passez Premium pour un historique illimité</div>
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {ACTIONS.map(a => (
                <button key={a} onClick={() => canLog && addEntry(a)} style={{background:"rgba(76,175,80,0.1)",border:"1px solid rgba(76,175,80,0.2)",borderRadius:10,padding:"10px 8px",color:"#e8f5e9",cursor:"pointer",fontSize:12,fontWeight:600}}>
                  {a}
                </button>
              ))}
            </div>
          )}
          {history.slice(0,5).map(h => (
            <div key={h.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
              <div>
                <div style={{fontWeight:700,fontSize:13}}>{h.action}</div>
                <div style={{fontSize:11,color:"#81c784"}}>{h.date}</div>
              </div>
              <button onClick={() => removeEntry(h.id)} style={{background:"none",border:"none",color:"#ef9a9a",cursor:"pointer",fontSize:18}}>×</button>
            </div>
          ))}
        </div>

        {/* Fonctionnalités verrouillées */}
        <div style={{...card(),background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={cardTitle}><span>🔒 Fonctionnalités Premium</span></div>
          {["🤖 Recommandations IA personnalisées","📍 Météo temps réel + alertes","💧 Calcul d'arrosage intelligent","📅 Planning 7 jours adapté météo","✅ Historique illimité","⚠️ Alertes gel, canicule, orages"].map(f => (
            <div key={f} style={{fontSize:12,color:"#81c784",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",opacity:0.6}}>{f}</div>
          ))}
        </div>

        {/* CTA Premium */}
        <button onClick={() => navigate("/subscribe")} style={{...btn.primary,marginBottom:10}}>
          ⭐ Passer Premium — 4,99€/mois
        </button>
        <button onClick={() => navigate("/admin")} style={{...btn.ghost}}>
          🔐 Accès Admin
        </button>
      </div>
    </div>
  );
}