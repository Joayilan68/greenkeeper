import { useNavigate } from "react-router-dom";
import { useProfile } from "../lib/useProfile";
import { useHistory } from "../lib/useHistory";
import { useWeather } from "../lib/useWeather";
import { useSubscription } from "../lib/useSubscription";
import { calcLawnScore } from "../lib/lawnScore";
import { MONTHLY_PLAN, MONTHS_FR } from "../lib/lawn";
import { card, cardTitle, btn, scroll, header } from "../lib/styles";

export default function MyLawn() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { history } = useHistory();
  const { weather } = useWeather();
  const { isPaid } = useSubscription();
  const month = new Date().getMonth() + 1;
  const plan = MONTHLY_PLAN[month];
  const scoreResult = calcLawnScore({ weather, profile, history, month });

  return (
    <div>
      <div style={header}>
        <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>🌿 Mon Gazon</div>
        <div style={{ fontSize:12, color:"#81c784", opacity:0.7, marginTop:4 }}>Analyse complète de votre pelouse</div>
      </div>
      <div style={scroll}>

        {/* Score détaillé */}
        <div style={{ ...card(), textAlign:"center" }}>
          <div style={{ fontSize:11, color:"#81c784", fontWeight:700, letterSpacing:1, marginBottom:8 }}>SCORE ACTUEL</div>
          <div style={{ fontSize:64, fontWeight:800, color: scoreResult.color }}>{scoreResult.score}</div>
          <div style={{ fontSize:14, color: scoreResult.color, fontWeight:700 }}>{scoreResult.label}</div>
          {isPaid && (
            <div style={{ fontSize:12, color:"#81c784", marginTop:6 }}>
              Potentiel atteignable : <span style={{ color:"#a5d6a7", fontWeight:700 }}>{scoreResult.potential}/100</span>
            </div>
          )}
        </div>

        {/* Points forts */}
        {scoreResult.strengths.length > 0 && (
          <div style={card()}>
            <div style={cardTitle}><span>✅ Points forts</span></div>
            {scoreResult.strengths.map((s, i) => (
              <div key={i} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:13, color:"#a5d6a7" }}>
                <span>{s.icon}</span> {s.label}
              </div>
            ))}
          </div>
        )}

        {/* Problèmes */}
        {isPaid && scoreResult.issues.length > 0 && (
          <div style={card()}>
            <div style={cardTitle}><span>⚠️ Points à améliorer</span></div>
            {scoreResult.issues.map((issue, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:13 }}>
                <span>{issue.icon} {issue.label}</span>
                <span style={{ color:"#ef9a9a" }}>{issue.impact} pts</span>
              </div>
            ))}
          </div>
        )}

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
              { label:"Type", val:profile.pelouse },
              { label:"Sol", val:profile.sol },
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
