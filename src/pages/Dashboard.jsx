import { useNavigate } from "react-router-dom";
import { useUser, UserButton } from "@clerk/clerk-react";
import { useWeather } from "../lib/useWeather";
import { useProfile } from "../lib/useProfile";
import { useHistory } from "../lib/useHistory";
import { useSubscription } from "../lib/useSubscription";
import { MONTHLY_PLAN, MONTHS_FR, calcArrosage, getWMO } from "../lib/lawn";
import AlertBanner from "../components/AlertBanner";
import { card, cardTitle, pill, btn, scroll, header } from "../lib/styles";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { weather = null,, locationName = "", alerts = [], loading = false, locLoading = false, refreshLocation = () => {} } = useWeather() || {};
  const { profile } = useProfile();
  const { history } = useHistory();
  const { isPaid = false, isAdmin = false } = useSubscription() || {};

  const today = new Date();
  const month = today.getMonth() + 1;
  const plan  = MONTHLY_PLAN[month];

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

        {/* SCORE PROVISOIRE */}
        <div style={{ ...card(), textAlign:"center", padding:24 }}>
          <div style={{ fontSize:11, color:"#81c784", fontWeight:700, letterSpacing:1, marginBottom:8 }}>🌿 SCORE SANTÉ DU GAZON</div>
          <div style={{ fontSize:64, fontWeight:800, color:"#43a047" }}>72</div>
          <div style={{ fontSize:14, color:"#43a047", fontWeight:700 }}>Bon</div>
          <div style={{ fontSize:12, color:"#81c784", marginTop:6 }}>Score dynamique bientôt actif</div>
        </div>

        {/* ALERTES */}
        {isPaid && alerts.map((a, i) => <AlertBanner key={i} alert={a} />)}

        {/* MÉTÉO */}
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
            {weather ? (() => {
              const w = getWMO(weather.code);
              return (
                <div style={{ display:"flex", gap:8 }}>
                  {[
                    { icon:w.icon, val:`${Math.round(weather.temp_max)}°C`, label:w.label },
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
              );
            })() : (
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

        {/* ACTIONS RAPIDES */}
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
                background: color, border:"1px solid rgba(255,255,255,0.1)",
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

        {/* PROFIL */}
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
