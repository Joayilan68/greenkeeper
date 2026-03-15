import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWeather } from "../lib/useWeather";
import { useProfile } from "../lib/useProfile";
import { useHistory } from "../lib/useHistory";
import { useSubscription } from "../lib/useSubscription";
import { MONTHLY_PLAN, MONTHS_FR, calcArrosage, getWMO } from "../lib/lawn";
import AlertBanner from "../components/AlertBanner";
import { card, cardTitle, btn, scroll, header } from "../lib/styles";
const ACTIONS = ["Tonte ✂️","Arrosage 💧","Engrais 🌱","Verticut 🔧","Aération 🌀","Désherbage 🪴","Regarnissage 🌾","Top-dressing 🏖️","Traitement fongicide 💊","Scarification 🔩"];
export default function Today() {
  const navigate = useNavigate();
  const { weather, alerts } = useWeather();
  const { profile } = useProfile();
  const { history, addEntry } = useHistory();
  const { isPaid, isAdmin, isFree } = useSubscription();
  const [aiReco, setAiReco] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [logged, setLogged] = useState([]);
  const today = new Date();
  const month = today.getMonth() + 1;
  const plan = MONTHLY_PLAN[month];
  const arros = profile && weather ? calcArrosage(month, profile, weather) : null;
  const canLog = isPaid || history.length < 5;
  const fetchAI = useCallback(async () => {
    if (!weather || !isPaid) return;
    setAiLoading(true); setAiReco("");
    const prompt = `Tu es un expert greenkeeper. Recommandations concises pour aujourd'hui. Profil: Type=${profile?.pelouse||"?"} Sol=${profile?.sol||"?"} Surface=${profile?.surface||"?"}m² Date: ${today.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})} — ${plan.label} Météo: ${weather.temp_max}°C / ${weather.temp_min}°C · ${weather.precip}mm · humidité ${weather.humidity}% · vent ${weather.wind}km/h Arrosage: ${arros ? arros.mm+"mm / "+arros.minutes+"min" : "aucun"} 4-5 points max, emojis, français.`;
    try {
      const res = await fetch("/api/ai_recommendations", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ prompt})});
      const data = await res.json();
      setAiReco(data.text||"");
    } catch { setAiReco("Impossible de contacter l'IA."); }
    setAiLoading(false);
  }, [weather, profile, month, arros, isPaid]);
  useEffect(() => { if (weather && isPaid) fetchAI(); }, [weather, isPaid]);
  const log = (action) => { if (!canLog) return; addEntry(action); setLogged(p => [...p, action]); setTimeout(() => setLogged(p => p.filter(x => x !== action)), 2000); };
  return (
    <div>
      <div style={header}>
        <div style={{fontSize:12,color:"#81c784"}}>{today.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
        <div style={{fontSize:20,fontWeight:800,color:"#a5d6a7",marginTop:4}}>Actions du jour</div>
        {isAdmin && <div style={{fontSize:11,color:"#f9a825",marginTop:4}}>👑 Mode Admin activé</div>}
        {isFree && <div style={{fontSize:11,color:"#81c784",marginTop:4}}>🆓 Accès gratuit · <span onClick={() => navigate("/subscribe")} style={{color:"#a5d6a7",cursor:"pointer",textDecoration:"underline"}}>Passer Premium</span></div>}
      </div>
      <div style={scroll}>
        {weather && (()=>{ const w=getWMO(weather.code); return (<div style={{...card(),background:"rgba(76,175,80,0.12)",border:"1px solid rgba(76,175,80,0.25)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:32,fontWeight:800}}>{Math.round(weather.temp_max)}°C</div><div style={{fontSize:13,color:"#81c784"}}>{w.label} · {weather.precip}mm</div><div style={{fontSize:11,color:"#81c784",opacity:0.7}}>Humidité {weather.humidity}% · Vent {weather.wind}km/h</div></div><div style={{fontSize:52}}>{w.icon}</div></div></div>); })()}
        {alerts.map((a,i) => <AlertBanner key={i} alert={a} />)}
        {arros && (<div style={{...card(),background:"rgba(25,118,210,0.1)",border:"1px solid rgba(100,181,246,0.25)"}}><div style={cardTitle}><span>💧 Arrosage recommandé</span></div><div style={{display:"flex",gap:8}}>{[{val:`${arros.mm}mm`,label:"Apport"},{val:`${arros.minutes}min`,label:"Durée"},{val:"5h–9h",label:"Horaire"}].map(({val,label}) => (<div key={label} style={{flex:1,background:"rgba(255,255,255,0.06)",borderRadius:12,padding:"10px 6px",textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:"#64b5f6"}}>{val}</div><div style={{fontSize:10,color:"#81c784"}}>{label}</div></div>))}</div></div>)}
        <div style={card()}><div style={cardTitle}><span>🤖 Recommandations IA</span>{isPaid && <button onClick={fetchAI} style={{background:"rgba(76,175,80,0.2)",border:"none",borderRadius:8,padding:"4px 10px",color:"#a5d6a7",fontSize:11,cursor:"pointer"}}>↻</button>}</div>{!isPaid ? (<div style={{textAlign:"center",padding:"16px 0"}}><div style={{fontSize:28,marginBottom:8}}>🔒</div><div style={{fontSize:13,color:"#81c784",marginBottom:12}}>Fonctionnalité Premium uniquement</div><button onClick={() => navigate("/subscribe")} style={{...btn.primary,width:"auto",padding:"10px 24px"}}>Passer Premium 🌿</button></div>) : aiLoading ? (<div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:28,display:"inline-block",animation:"spin 1.2s linear infinite"}}>🌿</div><div style={{fontSize:12,color:"#81c784",marginTop:8}}>Analyse en cours...</div></div>) : aiReco ? (<div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{aiReco}</div>) : (<div style={{fontSize:13,color:"#81c784",textAlign:"center",padding:"12px 0"}}>{!weather ? "Activez la géolocalisation" : "Appuyez sur ↻"}</div>)}</div>
        <div style={card()}><div style={cardTitle}><span>📅 {MONTHS_FR[month]}</span></div>{[{icon:"✂️",label:"Tonte",val:plan.tonte},{icon:"🌱",label:"Engrais",val:plan.engrais||"Aucun ce mois"},{icon:"🔧",label:"Verticut",val:plan.verticut?"À prévoir":"Non requis"},{icon:"🌀",label:"Aération",val:plan.aeration?"Recommandée":"Non requise"}].map(({icon,label,val}) => (<div key={label} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}><span style={{fontSize:16,minWidth:24}}>{icon}</span><div><div style={{fontSize:11,color:"#81c784",fontWeight:700}}>{label}</div><div style={{fontSize:13}}>{val}</div></div></div>))}</div>
        <div style={card()}><div style={cardTitle}><span>✅ Journaliser</span>{isFree && <span style={{fontSize:11,color:"#f9a825"}}>{history.length}/5 entrées</span>}</div>{!canLog ? (<div style={{textAlign:"center",padding:"16px 0"}}><div style={{fontSize:13,color:"#81c784",marginBottom:12}}>🔒 Limite gratuite atteinte (5 entrées)</div><button onClick={() => navigate("/subscribe")} style={{...btn.primary,width:"auto",padding:"10px 24px"}}>Passer Premium</button></div>) : (<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{ACTIONS.map(a => (<button key={a} onClick={() => log(a)} style={{background:logged.includes(a)?"rgba(76,175,80,0.3)":"rgba(76,175,80,0.1)",border:`1px solid ${logged.includes(a)?"#43a047":"rgba(76,175,80,0.2)"}`,borderRadius:10,padding:"10px 8px",color:"#e8f5e9",cursor:"pointer",fontSize:12,fontWeight:600}}>{logged.includes(a)?"✓ Fait !":a}</button>))}</div>)}</div>
      </div>
    </div>
  );
}
