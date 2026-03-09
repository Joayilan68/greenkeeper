import { useState, useEffect, useCallback } from "react";
import { useWeather } from "../lib/useWeather";
import { useProfile } from "../lib/useProfile";
import { useHistory } from "../lib/useHistory";
import { MONTHLY_PLAN, MONTHS_FR, calcArrosage, getWMO } from "../lib/lawn";
import AlertBanner from "../components/AlertBanner";
import { card, cardTitle, btn, scroll, header } from "../lib/styles";

const ACTIONS = ["Tonte ✂️","Arrosage 💧","Engrais 🌱","Verticut 🔧","Aération 🌀","Désherbage 🪴","Regarnissage 🌾","Top-dressing 🏖️","Traitement fongicide 💊","Scarification 🔩"];

export default function Today() {
  const { weather, alerts, loading } = useWeather();
  const { profile } = useProfile();
  const { addEntry } = useHistory();
  const [aiReco, setAiReco] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [logged, setLogged] = useState([]);

  const today = new Date();
  const month = today.getMonth() + 1;
  const plan  = MONTHLY_PLAN[month];
  const arros = profile && weather ? calcArrosage(month, profile, weather) : null;

  const fetchAI = useCallback(async () => {
    if (!weather) return;
    setAiLoading(true); setAiReco("");
    const prompt = `Tu es un expert greenkeeper professionnel. Recommandations concises pour aujourd'hui.

Profil pelouse : Type=${profile?.pelouse||"non défini"} · Sol=${profile?.sol||"non défini"} · Surface=${profile?.surface||"?"}m² · Matériel=${profile?.materiel?.join(",")||"standard"}
Date : ${today.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})} (mois ${month}) — ${plan.label}
Météo : ${weather.temp_max}°C max / ${weather.temp_min}°C min · ${weather.precip}mm pluie · humidité ${weather.humidity}% · vent ${weather.wind}km/h
Arrosage estimé : ${arros ? arros.mm+"mm / "+arros.minutes+" min" : "aucun ce mois"}

4-5 points clés maximum. Sois direct et pratique. Utilise des emojis.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:800, messages:[{role:"user",content:prompt}] })
      });
      const data = await res.json();
      setAiReco(data.content?.map(b=>b.text||"").join("\n") || "");
    } catch { setAiReco("Impossible de contacter l'IA."); }
    setAiLoading(false);
  }, [weather, profile, month, arros]);

  useEffect(() => { if (weather) fetchAI(); }, [weather]);

  const log = (action) => {
    addEntry(action);
    setLogged(p => [...p, action]);
    setTimeout(() => setLogged(p => p.filter(x => x !== action)), 2000);
  };

  return (
    <div>
      <div style={header}>
        <div style={{ fontSize:12, color:"#81c784" }}>{today.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
        <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7", marginTop:4 }}>Actions du jour</div>
      </div>
      <div style={scroll}>
        {/* Weather */}
        {weather && (() => {
          const w = getWMO(weather.code);
          return (
            <div style={{ ...card(), background:"rgba(76,175,80,0.12)", border:"1px solid rgba(76,175,80,0.25)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:32, fontWeight:800 }}>{Math.round(weather.temp_max)}°C</div>
                  <div style={{ fontSize:13, color:"#81c784" }}>{w.label} · {weather.precip}mm</div>
                  <div style={{ fontSize:11, color:"#81c784", opacity:0.7 }}>Humidité {weather.humidity}% · Vent {weather.wind}km/h</div>
                </div>
                <div style={{ fontSize:52 }}>{w.icon}</div>
              </div>
            </div>
          );
        })()}

        {alerts.map((a,i) => <AlertBanner key={i} alert={a} />)}

        {/* Arrosage */}
        {arros && (
          <div style={{ ...card(), background:"rgba(25,118,210,0.1)", border:"1px solid rgba(100,181,246,0.25)" }}>
            <div style={cardTitle}><span>💧 Arrosage recommandé</span></div>
            <div style={{ display:"flex", gap:8 }}>
              {[{ val:`${arros.mm}mm`, label:"Apport" }, { val:`${arros.minutes}min`, label:"Durée" }, { val:"5h–9h", label:"Horaire" }].map(({ val, label }) => (
                <div key={label} style={{ flex:1, background:"rgba(255,255,255,0.06)", borderRadius:12, padding:"10px 6px", textAlign:"center" }}>
                  <div style={{ fontSize:18, fontWeight:800, color:"#64b5f6" }}>{val}</div>
                  <div style={{ fontSize:10, color:"#81c784" }}>{label}</div>
                </div>
              ))}
            </div>
            {profile && <div style={{ fontSize:11, color:"#81c784", marginTop:8, opacity:0.7 }}>Pour {profile.surface}m² · sol {profile.sol} · {profile.pelouse}</div>}
          </div>
        )}

        {/* AI */}
        <div style={card()}>
          <div style={cardTitle}>
            <span>🤖 Recommandations IA</span>
            <button onClick={fetchAI} style={{ background:"rgba(76,175,80,0.2)", border:"none", borderRadius:8, padding:"4px 10px", color:"#a5d6a7", fontSize:11, cursor:"pointer" }}>↻</button>
          </div>
          {aiLoading ? (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ fontSize:28, display:"inline-block", animation:"spin 1.2s linear infinite" }}>🌿</div>
              <div style={{ fontSize:12, color:"#81c784", marginTop:8 }}>Analyse météo + profil...</div>
            </div>
          ) : aiReco ? (
            <div style={{ fontSize:13, lineHeight:1.8, whiteSpace:"pre-wrap" }}>{aiReco}</div>
          ) : (
            <div style={{ fontSize:13, color:"#81c784", textAlign:"center", padding:"12px 0" }}>
              {!weather ? "Activez la géolocalisation pour les recommandations IA" : "Appuyez sur ↻ pour générer"}
            </div>
          )}
        </div>

        {/* Plan du mois */}
        <div style={card()}>
          <div style={cardTitle}><span>📅 {MONTHS_FR[month]}</span></div>
          {[
            { icon:"✂️", label:"Tonte",    val:plan.tonte },
            { icon:"🌱", label:"Engrais",   val:plan.engrais||"Aucun ce mois" },
            { icon:"🔧", label:"Verticut",  val:plan.verticut?"À prévoir":"Non requis" },
            { icon:"🌀", label:"Aération",  val:plan.aeration?"Recommandée":"Non requise" },
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

        {/* Journal */}
        <div style={card()}>
          <div style={cardTitle}><span>✅ Journaliser</span></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {ACTIONS.map(a => (
              <button key={a} onClick={() => log(a)} style={{
                background: logged.includes(a) ? "rgba(76,175,80,0.3)" : "rgba(76,175,80,0.1)",
                border:`1px solid ${logged.includes(a)?"#43a047":"rgba(76,175,80,0.2)"}`,
                borderRadius:10, padding:"10px 8px", color:"#e8f5e9",
                cursor:"pointer", fontSize:12, fontWeight:600,
                transition:"all 0.2s",
              }}>
                {logged.includes(a) ? "✓ Fait !" : a}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
