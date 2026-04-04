import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWeather } from "../lib/useWeather";
import { useProfile } from "../lib/useProfile";
import { useHistory } from "../lib/useHistory";
import { useSubscription } from "../lib/useSubscription";
import { MONTHLY_PLAN, MONTHS_FR, calcArrosage, getWMO } from "../lib/lawn";
import AlertBanner from "../components/AlertBanner";
import { card, cardTitle, btn, scroll, header } from "../lib/styles";
import { useGreenPoints } from "../lib/useGreenPoints";
import { useStreak } from "../lib/useStreak";
import { getConseilApresAction } from "../lib/useRecommandations";
import { useSaison } from "../lib/useSaison";

const ACTIONS = ["Tonte ✂️","Arrosage 💧","Engrais 🌱","Verticut 🔧","Aération 🌀","Désherbage 🪴","Regarnissage 🌾","Top-dressing 🏖️","Traitement fongicide 💊","Scarification 🔩"];

const ACTION_TO_GP = {
  "Tonte ✂️":               "tonte",
  "Arrosage 💧":            "arrosage",
  "Engrais 🌱":             "engrais",
  "Verticut 🔧":            "scarification",
  "Aération 🌀":            "aeration",
  "Désherbage 🪴":          "desherbage",
  "Regarnissage 🌾":        "semences",
  "Top-dressing 🏖️":       "aeration",
  "Traitement fongicide 💊":"anti_mousse",
  "Scarification 🔩":       "scarification",
};

const ACTION_TO_CONSEIL = {
  "Tonte ✂️":    "tonte",
  "Arrosage 💧": "arrosage",
  "Engrais 🌱":  "engrais",
  "Aération 🌀": "aeration",
};

export default function Today() {
  const navigate = useNavigate();
  const { weather, alerts } = useWeather();
  const { profile } = useProfile();
  const { history, addEntry } = useHistory();
  const { isPaid, isAdmin, isFree } = useSubscription();
  const [aiReco, setAiReco]       = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [logged, setLogged]       = useState([]);

  const today = new Date();
  const month = today.getMonth() + 1;
  const plan  = MONTHLY_PLAN[month];
  const arros = profile && weather ? calcArrosage(month, profile, weather) : null;
  const canLog = isPaid || history.length < 5;

  const { mois } = useSaison();
  const { gagnerPoints, total: gpTotal, palier } = useGreenPoints();
  const { actuel: streak, enDanger, message: streakMsg, enregistrerConnexion } = useStreak();
  const [toastPoints, setToastPoints] = useState(null);

  useEffect(() => {
    enregistrerConnexion();
    gagnerPoints("connexion_quotidienne");
  }, []); // eslint-disable-line

  const afficherToast = (resultat, conseil = null) => {
    if (!resultat?.succes) return;
    setToastPoints({ ...resultat, conseil });
    setTimeout(() => setToastPoints(null), 3500);
  };

  const fetchAI = useCallback(async () => {
    if (!weather || !isPaid) return;
    setAiLoading(true); setAiReco("");
    const prompt = `Tu es un expert gazon pour Mongazon360. Recommandations concises pour aujourd'hui. Profil: Type=${profile?.pelouse||"?"} Sol=${profile?.sol||"?"} Surface=${profile?.surface||"?"}m² Date: ${today.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})} — ${plan.label} Météo: ${weather.temp_max}°C / ${weather.temp_min}°C · ${weather.precip}mm · humidité ${weather.humidity}% · vent ${weather.wind}km/h Arrosage: ${arros ? arros.mm+"mm / "+arros.minutes+"min" : "aucun"} 4-5 points max, emojis, français.`;
    try {
      const res  = await fetch("/api/ai-recommendations", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ prompt }) });
      const data = await res.json();
      setAiReco(data.text || "");
    } catch { setAiReco("Impossible de contacter l'IA."); }
    setAiLoading(false);
  }, [weather, profile, month, arros, isPaid]);

  useEffect(() => { if (weather && isPaid) fetchAI(); }, [weather, isPaid]);

  const log = (action) => {
    if (!canLog) return;
    addEntry(action);
    setLogged(p => [...p, action]);
    setTimeout(() => setLogged(p => p.filter(x => x !== action)), 2000);
    const gpKey      = ACTION_TO_GP[action];
    const conseilKey = ACTION_TO_CONSEIL[action];
    if (gpKey) {
      const res     = gagnerPoints(gpKey);
      const conseil = conseilKey ? getConseilApresAction(conseilKey, mois, profile, null) : null;
      afficherToast(res, conseil);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ ...header, textAlign:"left" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <img src="/mg360-mascot-transparent.png" alt="MG360" style={{ width:40, height:40, objectFit:"contain" }} />
            <div>
              <div style={{ fontSize:12, color:"#81c784" }}>{today.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
              <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>Actions du jour</div>
            </div>
          </div>
          {isAdmin && <div style={{ fontSize:11, color:"#f9a825" }}>👑 Admin</div>}
        </div>
        {isFree && <div style={{ fontSize:11, color:"#81c784", marginTop:4 }}>🆓 Accès gratuit · <span onClick={() => navigate("/subscribe")} style={{ color:"#a5d6a7", cursor:"pointer", textDecoration:"underline" }}>Passer Premium</span></div>}
      </div>

      <div style={scroll}>

        {/* Bandeau Streak */}
        {streak > 0 && (
          <div style={{ background: enDanger ? "#fff3e0" : "#e8f5e9", border:`1px solid ${enDanger ? "#f9a825" : "#a5d6a7"}`, borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <span style={{ fontSize:22 }}>{enDanger ? "⚠️" : "🔥"}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, color:enDanger?"#e65100":"#2e7d32", fontSize:14 }}>{streakMsg}</div>
              {enDanger && <div style={{ fontSize:11, color:"#f57c00" }}>Connecte-toi aujourd'hui pour garder ton streak !</div>}
            </div>
            <div style={{ background:"#e8f5e9", color:"#2e7d32", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:600 }}>
              {palier?.icone} {gpTotal.toLocaleString("fr-FR")} pts
            </div>
          </div>
        )}

        {/* Météo — Premium uniquement */}
        {isPaid && weather && (()=>{ const w=getWMO(weather.code); return (<div style={{...card(),background:"rgba(76,175,80,0.12)",border:"1px solid rgba(76,175,80,0.25)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:32,fontWeight:800}}>{Math.round(weather.temp_max)}°C</div><div style={{fontSize:13,color:"#81c784"}}>{w.label} · {weather.precip}mm</div><div style={{fontSize:11,color:"#81c784",opacity:0.7}}>Humidité {weather.humidity}% · Vent {weather.wind}km/h</div></div><div style={{fontSize:52}}>{w.icon}</div></div></div>); })()}

        {/* Météo verrouillée pour Free */}
        {!isPaid && (
          <div style={{ ...card(), textAlign:"center", padding:14, background:"rgba(255,255,255,0.03)" }}>
            <div style={{ fontSize:13, color:"#81c784", marginBottom:8 }}>🔒 Météo temps réel — Premium uniquement</div>
            <button onClick={() => navigate("/subscribe")} style={{ ...btn.primary, width:"auto", padding:"8px 20px", fontSize:12 }}>Passer Premium</button>
          </div>
        )}

        {/* Alertes — Premium uniquement */}
        {isPaid && alerts.map((a,i) => <AlertBanner key={i} alert={a} />)}

        {/* Arrosage — Premium uniquement */}
        {isPaid && arros && (<div style={{...card(),background:"rgba(25,118,210,0.1)",border:"1px solid rgba(100,181,246,0.25)"}}><div style={cardTitle}><span>💧 Arrosage recommandé</span></div><div style={{display:"flex",gap:8}}>{[{val:`${arros.mm}mm`,label:"Apport"},{val:`${arros.minutes}min`,label:"Durée"},{val:"5h–9h",label:"Horaire"}].map(({val,label}) => (<div key={label} style={{flex:1,background:"rgba(255,255,255,0.06)",borderRadius:12,padding:"10px 6px",textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:"#64b5f6"}}>{val}</div><div style={{fontSize:10,color:"#81c784"}}>{label}</div></div>))}</div></div>)}

        {/* IA Recommandations */}
        <div style={card()}><div style={cardTitle}><span>🤖 Recommandations IA</span>{isPaid && <button onClick={fetchAI} style={{background:"rgba(76,175,80,0.2)",border:"none",borderRadius:8,padding:"4px 10px",color:"#a5d6a7",fontSize:11,cursor:"pointer"}}>↻</button>}</div>{!isPaid ? (<div style={{textAlign:"center",padding:"16px 0"}}><div style={{fontSize:28,marginBottom:8}}>🔒</div><div style={{fontSize:13,color:"#81c784",marginBottom:12}}>Fonctionnalité Premium uniquement</div><button onClick={() => navigate("/subscribe")} style={{...btn.primary,width:"auto",padding:"10px 24px"}}>Passer Premium 🌿</button></div>) : aiLoading ? (<div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:28,display:"inline-block",animation:"spin 1.2s linear infinite"}}>🌿</div><div style={{fontSize:12,color:"#81c784",marginTop:8}}>Analyse en cours...</div></div>) : aiReco ? (<div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{aiReco}</div>) : (<div style={{fontSize:13,color:"#81c784",textAlign:"center",padding:"12px 0"}}>{!weather ? "Activez la géolocalisation" : "Appuyez sur ↻"}</div>)}</div>

        {/* Plan du mois */}
        <div style={card()}><div style={cardTitle}><span>📅 {MONTHS_FR[month]}</span></div>{[{icon:"✂️",label:"Tonte",val:plan.tonte},{icon:"🌱",label:"Engrais",val:plan.engrais||"Aucun ce mois"},{icon:"🔧",label:"Verticut",val:plan.verticut?"À prévoir":"Non requis"},{icon:"🌀",label:"Aération",val:plan.aeration?"Recommandée":"Non requise"}].map(({icon,label,val}) => (<div key={label} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}><span style={{fontSize:16,minWidth:24}}>{icon}</span><div><div style={{fontSize:11,color:"#81c784",fontWeight:700}}>{label}</div><div style={{fontSize:13}}>{val}</div></div></div>))}</div>

        {/* ── JOURNALISER + ACTIONS RECOMMANDÉES (déplacé depuis MyLawn) ── */}
        <div style={card()}>
          <div style={cardTitle}>
            <span>✅ Journaliser</span>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {isFree && <span style={{ fontSize:11, color:"#f9a825" }}>{history.length}/5 entrées</span>}
              <span style={{ fontSize:11, color:"#81c784", background:"rgba(76,175,80,0.15)", borderRadius:20, padding:"2px 8px" }}>
                🌿 {gpTotal.toLocaleString("fr-FR")} pts
              </span>
            </div>
          </div>

          {/* Actions recommandées aujourd'hui — uniquement si l'utilisateur peut journaliser */}
          {canLog && (arros || plan?.engrais) && (
            <div style={{ marginBottom:12, padding:"10px 12px", background:"rgba(76,175,80,0.08)", borderRadius:12, border:"1px solid rgba(76,175,80,0.2)" }}>
              <div style={{ fontSize:11, color:"#81c784", fontWeight:700, marginBottom:8, letterSpacing:0.5 }}>🎯 RECOMMANDÉES AUJOURD'HUI</div>
              {[
                ...(arros ? [{ icon:"💧", text:`Arroser ${arros.minutes} min`, gain:"+20 pts", action:"Arrosage 💧" }] : []),
                { icon:"✂️", text:`Tondre à ${plan?.hauteur || "4"} cm`, gain:"+50 pts", action:"Tonte ✂️" },
                ...(plan?.engrais ? [{ icon:"🌱", text:"Appliquer engrais", gain:"+80 pts", action:"Engrais 🌱" }] : []),
              ].slice(0,3).map((action, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <span style={{ fontSize:13 }}>{action.icon} {action.text}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:11, color:"#a5d6a7", fontWeight:700 }}>{action.gain}</span>
                    <button
                      onClick={() => log(action.action)}
                      style={{ background: logged.includes(action.action) ? "rgba(76,175,80,0.4)" : "rgba(76,175,80,0.2)", border:"none", borderRadius:8, padding:"4px 10px", color:"#a5d6a7", fontSize:11, cursor:"pointer", fontWeight:700 }}
                    >
                      {logged.includes(action.action) ? "✓ Fait !" : "Faire →"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!canLog ? (
            <div style={{ textAlign:"center", padding:"16px 0" }}>
              <div style={{ fontSize:13, color:"#81c784", marginBottom:12 }}>🔒 Limite gratuite atteinte (5 entrées)</div>
              <button onClick={() => navigate("/subscribe")} style={{ ...btn.primary, width:"auto", padding:"10px 24px" }}>Passer Premium</button>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {ACTIONS.map(a => (
                <button key={a} onClick={() => log(a)} style={{
                  background: logged.includes(a) ? "rgba(76,175,80,0.3)" : "rgba(76,175,80,0.1)",
                  border:     `1px solid ${logged.includes(a) ? "#43a047" : "rgba(76,175,80,0.2)"}`,
                  borderRadius:10, padding:"10px 8px", color:"#e8f5e9",
                  cursor:"pointer", fontSize:12, fontWeight:600,
                }}>
                  {logged.includes(a) ? "✓ Fait !" : a}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Toast GreenPoints */}
      {toastPoints && (
        <div style={{ position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)", zIndex:9999, background:"#1a2e1a", border:"2px solid #43a047", borderRadius:16, padding:"12px 20px", boxShadow:"0 8px 32px rgba(0,0,0,0.4)", maxWidth:340, width:"90vw" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:28 }}>{toastPoints.icone}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, color:"#a5d6a7", fontSize:16 }}>+{toastPoints.points} GreenPoints !</div>
              <div style={{ color:"#81c784", fontSize:12 }}>Total : {toastPoints.total?.toLocaleString("fr-FR")} pts · {toastPoints.palier?.icone} {toastPoints.palier?.label}</div>
            </div>
          </div>
          {toastPoints.conseil && (
            <div style={{ marginTop:10, padding:"8px 12px", background:"rgba(76,175,80,0.15)", borderRadius:8, borderLeft:"3px solid #43a047", color:"#a5d6a7", fontSize:12, lineHeight:1.4 }}>
              {toastPoints.conseil}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
