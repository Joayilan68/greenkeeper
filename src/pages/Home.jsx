import { useNavigate } from "react-router-dom";
import { useUser, UserButton } from "@clerk/clerk-react";
import { useWeather } from "../lib/useWeather";
import { useProfile } from "../lib/useProfile";
import { MONTHLY_PLAN, MONTHS_FR, calcArrosage, getWMO } from "../lib/lawn";
import AlertBanner from "../components/AlertBanner";
import { card, cardTitle, pill, btn, scroll, header } from "../lib/styles";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { weather, locationName, alerts, loading, locLoading, fetchLocation } = useWeather();
  const { profile } = useProfile();

  const today = new Date();
  const month = today.getMonth() + 1;
  const plan  = MONTHLY_PLAN[month];
  const arros = profile && weather ? calcArrosage(month, profile, weather) : null;

  return (
    <div>
      <div style={{ ...header, display:"flex", flexDirection:"column", alignItems:"center" }}>
        <div style={{ width:"100%", display:"flex", justifyContent:"flex-end", paddingRight:4, marginBottom:8 }}>
          <UserButton appearance={{ variables: { colorPrimary:"#43a047" } }} />
        </div>
        <div style={{ fontSize:36 }}>🌿</div>
        <div style={{ fontSize:22, fontWeight:800, color:"#a5d6a7" }}>GreenKeeper</div>
        <div style={{ fontSize:12, color:"#81c784", opacity:0.7, marginTop:2 }}>
          Bonjour {user?.firstName || ""} · {today.toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" })}
        </div>
      </div>

      <div style={scroll}>
        {/* Location + Weather */}
        <div style={{ ...card(), background:"linear-gradient(135deg,rgba(46,125,50,0.3),rgba(27,94,32,0.2))", border:"1px solid rgba(165,214,167,0.2)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div>
              <div style={{ fontSize:11, color:"#81c784", fontWeight:700, letterSpacing:1 }}>LOCALISATION</div>
              <div style={{ fontWeight:800, fontSize:16, marginTop:2 }}>{locationName || (weather ? "Position détectée" : "Non définie")}</div>
            </div>
            <button onClick={fetchLocation} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:10, padding:"8px 14px", color:"#e8f5e9", fontSize:12, cursor:"pointer", fontWeight:600 }}>
              {locLoading ? "⌛" : weather ? "🔄" : "📍 Localiser"}
            </button>
          </div>
          {weather ? (() => {
            const w = getWMO(weather.code);
            return (
              <div style={{ display:"flex", gap:8 }}>
                {[
                  { icon:w.icon, val:`${Math.round(weather.temp_max)}°C`, label:w.label },
                  { icon:"💧",   val:`${weather.precip}mm`,               label:"Précipitations" },
                  { icon:"💨",   val:`${weather.wind}`,                   label:"km/h vent" },
                ].map(({ icon, val, label }) => (
                  <div key={label} style={{ flex:1, background:"rgba(255,255,255,0.06)", borderRadius:12, padding:"10px 6px", textAlign:"center" }}>
                    <div style={{ fontSize:22 }}>{icon}</div>
                    <div style={{ fontSize:17, fontWeight:800 }}>{val}</div>
                    <div style={{ fontSize:10, color:"#81c784" }}>{label}</div>
                  </div>
                ))}
              </div>
            );
          })() : (
            <div style={{ textAlign:"center", padding:"12px 0", color:"#81c784", fontSize:13 }}>
              {loading ? "🌿 Chargement météo..." : "Appuyez sur 📍 Localiser pour voir la météo"}
            </div>
          )}
        </div>

        {/* Alerts */}
        {alerts.map((a, i) => <AlertBanner key={i} alert={a} />)}

        {/* Month summary */}
        <div style={card()}>
          <div style={cardTitle}><span>📅 {MONTHS_FR[month]} — {plan.label}</span></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[
              { icon:"✂️", label:"Tonte",   val: plan.tonte.split("·")[0] },
              { icon:"🌱", label:"Engrais",  val: plan.engrais ? plan.engrais.split("·")[0] : "—" },
              { icon:"💧", label:"Arrosage", val: arros ? `${arros.mm}mm · ${arros.minutes}min` : plan.arrosage_base===0 ? "Aucun" : "📍 requis" },
              { icon:"🔧", label: plan.aeration ? "Aération" : "Verticut", val: (plan.aeration || plan.verticut) ? "Ce mois ✓" : "—" },
            ].map(({ icon, label, val }) => (
              <div key={label} style={{ background:"rgba(255,255,255,0.05)", borderRadius:12, padding:"10px" }}>
                <div style={{ fontSize:18, marginBottom:4 }}>{icon}</div>
                <div style={{ fontSize:10, color:"#81c784", fontWeight:700, textTransform:"uppercase", letterSpacing:0.8 }}>{label}</div>
                <div style={{ fontSize:12, fontWeight:700, marginTop:2 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Profile pill */}
        <div style={card()}>
          <div style={cardTitle}>
            <span>👤 Mon profil</span>
            <button onClick={() => navigate("/setup")} style={{ background:"rgba(76,175,80,0.2)", border:"none", borderRadius:8, padding:"4px 10px", color:"#a5d6a7", fontSize:11, cursor:"pointer" }}>
              {profile ? "Modifier" : "Configurer"}
            </button>
          </div>
          {profile ? (
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {[`🌿 ${profile.pelouse}`, `🏔️ Sol ${profile.sol}`, `📐 ${profile.surface}m²`,
                ...(profile.materiel||[]).map(m=>`✓ ${m}`)].map(t=>(
                <span key={t} style={pill()}>{t}</span>
              ))}
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:"12px 0" }}>
              <div style={{ fontSize:13, color:"#81c784", marginBottom:12 }}>Personnalisez vos recommandations</div>
              <button onClick={() => navigate("/setup")} style={{ ...btn.primary, width:"auto", padding:"10px 28px" }}>Configurer</button>
            </div>
          )}
        </div>

        {/* CTAs */}
        <button onClick={() => navigate("/today")} style={{ ...btn.primary, marginBottom:10 }}>🌿 Mes actions du jour</button>
        <button onClick={() => navigate("/week")}  style={btn.ghost}>📅 Planning de la semaine →</button>
      </div>
    </div>
  );
}
