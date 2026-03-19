import { useNavigate } from "react-router-dom";
import { useUser, UserButton } from "@clerk/clerk-react";
import { useWeather } from "../lib/useWeather";
import { useProfile } from "../lib/useProfile";
import { useHistory } from "../lib/useHistory";
import { useSubscription } from "../lib/useSubscription";
import { MONTHLY_PLAN, MONTHS_FR, getWMO } from "../lib/lawn";
import { calcLawnScore } from "../lib/lawnScore";
import AlertBanner from "../components/AlertBanner";
import { card, cardTitle, pill, btn, scroll, header } from "../lib/styles";
import { useState } from "react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { weather, locationName, alerts = [], loading, locLoading, refreshLocation } = useWeather() || {};
  const { profile } = useProfile();
  const { history = [] } = useHistory();
  const { isPaid = false, isAdmin = false } = useSubscription() || {};
  const [visualScore, setVisualScore] = useState(null);

  const today = new Date();
  const month = today.getMonth() + 1;
  const plan = MONTHLY_PLAN[month];

  const { score, potential, label, color, issues, strengths } = calcLawnScore({
    weather, profile, history, month, visualScore
  });

  return (
    <div>
      <div style={{ ...header, display:"flex", flexDirection:"column", alignItems:"center" }}>
        <div style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", paddingRight:4, marginBottom:8 }}>
          <div style={{ fontSize:11, color:"#81c784" }}>
            {today.toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" })}
          </div>
          <UserButton appearance={{ variables: { colorPrimary:"#43a047" } }} />
        </div>
        <div style={{ fontSize:24, fontWeight:800, color:"#a5d6a7" }}>
          Bonjour {user?.firstName || ""} 👋
        </div>
        {isAdmin && <div style={{ fontSize:11, color:"#f9a825", marginTop:2 }}>👑 Mode Admin</div>}
      </div>

      <div style={scroll}>

        <div style={{ ...card(), background:"linear-gradient(135deg, rgba(27,94,32,0.4), rgba(13,43,26,0.6))", border:`1px solid ${color}44` }}>
          <div style={{ fontSize:11, color:"#81c784", fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", marginBottom:12, textAlign:"center" }}>
            🌿 Score Santé du Gazon
          </div>
          <div style={{ textAlign:"center", marginBottom:16 }}>
            <svg width="140" height="80" viewBox="0 0 140 80">
              <path d="M 10 75 A 60 60 0 0 1 130 75" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" strokeLinecap="round"/>
              <path d="M 10 75 A 60 60 0 0 1 130 75" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(score/100)*188} 188`}/>
              <text x="70" y="68" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" fontFamily="Arial">{score}</text>
              <text x="70" y="78" textAnchor="middle" fill={color} fontSize="10" fontFamily="Arial">/100</text>
            </svg>
            <div style={{ fontSize:16, fontWeight:800, color, marginTop:4 }}>{label}</div>
            {isPaid && (
              <div style={{ fontSize:12, color:"#81c784", marginTop:4 }}>
                Potentiel : <span style={{ color:"#a5d6a7", fontWeight:700 }}>{potential}/100</span>
                <span style={{ color:"#f9a825", marginLeft:6 }}>+{potential - score} pts possibles</span>
              </div>
            )}
          </div>

          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:"#81c784", marginBottom:8, textAlign:"center" }}>Comment est votre gazon visuellement ?</div>
            <div style={{ display:"flex", justifyContent:"center", gap:8 }}>
              {[{v:1,e:"😟"},{v:2,e:"😐"},{v:3,e:"🙂"},{v:4,e:"😊"},{v:5,e:"🤩"}].map(({v,e}) => (
                <button key={v} onClick={() => setVisualScore(v)} style={{
                  background: visualScore===v ? "rgba(76,175,80,0.3)" : "rgba(255,255,255,0.05)",
                  border:`1px solid ${visualScore===v ? "#43a047" : "rgba(255,255,255,0.1)"}`,
                  borderRadius:10, padding:"6px 4px", cursor:"pointer", minWidth:44,
                  display:"flex", flexDirection:"column", alignItems:"center",
                }}>
                  <span style={{ fontSize:20 }}>{e}</span>
                </button>
              ))}
            </div>
          </div>

          {isPaid && issues.length > 0 && (
            <div>
              <div style={{ fontSize:12, color:"#f9a825", fontWeight:700, marginBottom:6 }}>⚠️ {issues.length} problème{issues.length>1?"s":""} détecté{issues.length>1?"s":""}</div>
              {issues.slice(0,3).map((issue,i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 8px", background:"rgba(239,108,0,0.1)", borderRadius:8, marginBottom:4, fontSize:12 }}>
                  <span>{issue.icon} {issue.label}</span>
                  <span style={{ color:"#ef9a9a" }}>{issue.impact} pts</span>
                </div>
              ))}
            </div>
          )}

          {!isPaid && (
            <div style={{ textAlign:"center", marginTop:8 }}>
              <div style={{ fontSize:12, color:"#81c784", marginBottom:8 }}>
                🔒 Débloquez le diagnostic complet — <span style={{ color:"#f9a825", fontWeight:700 }}>+{potential-score} pts possibles</span>
              </div>
              <button onClick={() => navigate("/subscribe")} style={{ ...btn.primary, width:"auto", padding:"8px 20px", fontSize:12 }}>
                ⭐ Améliorer mon gazon
              </button>
            </div>
          )}
        </div>

        {isPaid && alerts.map((a, i) => <AlertBanner key={i} alert={a} />)}

        {isPaid ? (
          <div style={{ ...card(), background:"linear-gradient(135deg,rgba(46,125,50,0.3),rgba(27,94,32,0.2))", border:"1px solid rgba(165,214,167,0.2)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div>
                <div style={{ fontSize:11, color:"#81c784", fontWeight:700, letterSpacing:1 }}>📍 {locationName || "Localisation"}</div>
                <div style={{ fontSize:12, color:"#81c784", opacity:0.7 }}>{MONTHS_FR[month]} — {plan.label}</div>
              </div>
              <button onClick={refreshLocation} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:10, padding:"6px 12px", color:"#e8f5e9", fontSize:12, cursor:"pointer" }}>
                {locLoading ? "⌛" : "🔄"}
              </button>
            </div>
            {weather ? (
              <div style={{ display:"flex", gap:8 }}>
                {[
                  { icon:getWMO(weather.code).icon, val:`${Math.round(weather.temp_max)}°C`, label:getWMO(weather.code).label },
                  { icon:"💧", val:`${weather.precip}mm`, label:"Pluie" },
                  { icon:"💨", val:`${weather.wind}km/h`, label:"Vent" },
                ].map(({ icon, val, label }) => (
                  <div key={label} style={{ flex:1, background:"rgba(255,255,255,0.06)", borderRadius:12, padding:"8px 6px", textAlign:"center" }}>
                    <div style={{ fontSize:20 }}>{icon}</div>
                    <div style={{ fontSize:15, fontWeight:800 }}>{val}</div>
                    <div style={{ fontSize:10, color:"#81c784" }}>{label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign:"center", color:"#81c784", fontSize:13, padding:"8px 0" }}>
                {loading || locLoading ? "🌿 Détection..." : "🔄 Actualiser"}
              </div>
            )}
          </div>
        ) : (
          <div style={{ ...card(), textAlign:"center", padding:14 }}>
            <div style={{ fontSize:13, color:"#81c784", marginBottom:8 }}>🔒 Météo temps réel — Premium uniquement</div>
            <button onClick={() => navigate("/subscribe")} style={{ ...btn.primary, width:"auto", padding:"8px 20px", fontSize:13 }}>Passer Premium</button>
          </div>
        )}

        <div style={card()}>
          <div style={cardTitle}><span>⚡ Actions rapides</span></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[
              { icon:"🔬", label:"Diagnostic",  route:"/diagnostic", color:"rgba(33,150,243,0.2)" },
              { icon:"📅", label:"Aujourd'hui", route:"/today",      color:"rgba(76,175,80,0.2)" },
              { icon:"🌿", label:"Mon Gazon",   route:"/my-lawn",    color:"rgba(46,125,50,0.2)" },
              { icon:"🛒", label:"Produits",    route:"/products",   color:"rgba(255,152,0,0.2)" },
            ].map(({ icon, label, route, color }) => (
              <button key={route} onClick={() => navigate(route)} style={{
                background:color, border:"1px solid rgba(255,255,255,0.1)",
                borderRadius:14, padding:"14px 8px", cursor:"pointer",
                color:"#e8f5e9", fontWeight:700, fontSize:13,
                display:"flex", flexDirection:"column", alignItems:"center", gap:6,
              }}>
                <span style={{ fontSize:24 }}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={card()}>
          <div style={cardTitle}>
            <span>👤 Mon profil</span>
            <button onClick={() => navigate("/setup")} style={{ background:"rgba(76,175,80,0.2)", border:"none", borderRadius:8, padding:"4px 10px", color:"#a5d6a7", fontSize:11, cursor:"pointer" }}>
              {profile ? "Modifier" : "Configurer"}
            </button>
          </div>
          {profile ? (
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {[`🌿 ${profile.pelouse}`, `🏔️ Sol ${profile.sol}`, `📐 ${profile.surface}m²`].map(t => (
                <span key={t} style={pill()}>{t}</span>
              ))}
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:"10px 0" }}>
              <div style={{ fontSize:13, color:"#81c784", marginBottom:10 }}>Configurez votre profil pour un score précis</div>
              <button onClick={() => navigate("/setup")} style={{ ...btn.primary, width:"auto", padding:"8px 24px" }}>Configurer</button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
