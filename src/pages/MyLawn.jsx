import { useNavigate } from "react-router-dom";
import { useProfile } from "../lib/useProfile";
import { useSubscription } from "../lib/useSubscription";
import { MONTHLY_PLAN, MONTHS_FR } from "../lib/lawn";
import { card, cardTitle, btn, scroll, header } from "../lib/styles";

export default function MyLawn() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { isPaid } = useSubscription();
  const month = new Date().getMonth() + 1;
  const plan = MONTHLY_PLAN[month];

  return (
    <div>
      <div style={header}>
        <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>🌿 Mon Gazon</div>
        <div style={{ fontSize:12, color:"#81c784", opacity:0.7, marginTop:4 }}>Analyse complète de votre pelouse</div>
      </div>
      <div style={scroll}>

        {/* Plan du mois */}
        <div style={card()}>
          <div style={cardTitle}><span>📅 Plan {MONTHS_FR[month]}</span></div>
          <div style={{ fontSize:13, color:"#a5d6a7", fontWeight:700, marginBottom:10 }}>{plan.label}</div>
          {[
            { icon:"✂️", label:"Tonte",   val:plan.tonte },
            { icon:"🌱", label:"Engrais",  val:plan.engrais||"Aucun ce mois" },
            { icon:"🔧", label:"Verticut", val:plan.verticut?"À prévoir":"Non requis" },
            { icon:"🌀", label:"Aération", val:plan.aeration?"Recommandée":"Non requise" },
          ].map(({ icon, label, val }) => (
            <div key={label} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize:16, minWidth:24 }}>{icon}</span>
              <div>
                <div style={{ fontSize:11, color:"#81c784", fontWeight:700 }}>{label}</div>
                <div style={{ fontSize:13 }}>{val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Profil */}
        {profile && (
          <div style={card()}>
            <div style={cardTitle}><span>👤 Mon profil pelouse</span></div>
            {[
              { label:"Type",    val:profile.pelouse },
              { label:"Sol",     val:profile.sol },
              { label:"Surface", val:`${profile.surface} m²` },
            ].map(({ label, val }) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:13 }}>
                <span style={{ color:"#81c784" }}>{label}</span>
                <span style={{ fontWeight:600 }}>{val}</span>
              </div>
            ))}
          </div>
        )}

        {!isPaid && (
          <div style={{ ...card(), textAlign:"center" }}>
            <div style={{ fontSize:13, color:"#81c784", marginBottom:10 }}>🔒 Analyse complète disponible en Premium</div>
            <button onClick={() => navigate("/subscribe")} style={{ ...btn.primary, width:"auto", padding:"10px 24px" }}>
              ⭐ Passer Premium
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
