import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWeather } from "../lib/useWeather";
import { useProfile } from "../lib/useProfile";
import { useHistory } from "../lib/useHistory";
import { useSubscription } from "../lib/useSubscription";
import { MONTHLY_PLAN, MONTHS_FR, calcArrosage, getWMO, getDebitMmH } from "../lib/lawn";
import AlertBanner from "../components/AlertBanner";
import { card, cardTitle, btn, scroll } from "../lib/styles";
import { useGreenPoints } from "../lib/useGreenPoints";
import { useStreak } from "../lib/useStreak";
import { getConseilApresAction } from "../lib/useRecommandations";
import { useSaison } from "../lib/useSaison";

// ── Règles de fréquence alignées sur useRecommandations.js ───────────────────
// intervalDays = délai minimum entre deux applications de la même action
const FREQ_RULES = [
  {
    id:       "tonte",
    label:    "Tonte ✂️",
    gp:       "tonte",
    mois:     [3,4,5,6,7,8,9,10],
    interval: (month) => month >= 6 && month <= 8 ? 4 : month >= 3 && month <= 5 ? 5 : 7,
    keywords: ["tonte"],
  },
  {
    id:       "arrosage",
    label:    "Arrosage 💧",
    gp:       "arrosage",
    mois:     [3,4,5,6,7,8,9,10],
    interval: () => 1,                    // géré aussi par calcArrosage
    keywords: ["arrosage"],
    weatherDriven: true,                  // ne s'affiche que si calcArrosage le dit
  },
  {
    id:       "engrais",
    label:    "Engrais 🌱",
    gp:       "engrais",
    mois:     [2,3,5,6,9,10,11],
    interval: () => 45,
    keywords: ["engrais"],
  },
  {
    id:       "desherbage",
    label:    "Désherbage 🪴",
    gp:       "desherbage",
    mois:     [4,5,9],
    interval: () => 21,
    keywords: ["desherb","désherb"],
  },
  {
    id:       "aeration",
    label:    "Aération 🌀",
    gp:       "aeration",
    mois:     [3,4,9],
    interval: () => 90,
    keywords: ["aeration","aération"],
  },
  {
    id:       "scarification",
    label:    "Scarification 🔩",
    gp:       "scarification",
    mois:     [3,4,9],
    interval: () => 180,
    keywords: ["scarif","verticut"],
  },
  {
    id:       "regarnissage",
    label:    "Regarnissage 🌾",
    gp:       "semences",
    mois:     [3,4,5,6,8,9],
    interval: () => 60,
    keywords: ["semences","semis","regarnissage"],
  },
  {
    id:       "topdressing",
    label:    "Top-dressing 🏖️",
    gp:       "aeration",
    mois:     [3,4,9],
    interval: () => 90,
    keywords: ["top-dressing","topdressing","top_dressing"],
  },
  {
    id:       "antimousse",
    label:    "Anti-mousse 💊",
    gp:       "anti_mousse",
    mois:     [3,4,9],
    interval: () => 30,
    keywords: ["anti_mousse","mousse","fongicide"],
  },
];

// ── Helpers historique ────────────────────────────────────────────────────────
function daysSince(history, keywords) {
  if (!history?.length) return 999;
  const matches = history.filter(h =>
    keywords.some(kw => h.action?.toLowerCase().includes(kw.toLowerCase()))
  );
  if (!matches.length) return 999;
  const days = matches.map(h => {
    const parts = h.date?.split("/");
    if (!parts || parts.length !== 3) return 999;
    const d = new Date(parts[2], parts[1] - 1, parts[0]);
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  });
  return Math.min(...days);
}

function doneToday(history, keywords) {
  return daysSince(history, keywords) === 0;
}

// ── Calcul du statut de chaque action ────────────────────────────────────────
// Statuts : "recommended" | "done_today" | "too_soon" | "off_season"
function getActionStatus(rule, month, history, arros) {
  if (!rule.mois.includes(month)) return { status: "off_season", daysLeft: null };

  // Arrosage piloté par la météo
  if (rule.weatherDriven && !arros) return { status: "off_season", daysLeft: null };

  const since    = daysSince(history, rule.keywords);
  const interval = rule.interval(month);

  if (since === 0) return { status: "done_today", daysLeft: 0 };
  if (since < interval) {
    const daysLeft = interval - since;
    return { status: "too_soon", daysLeft };
  }
  return { status: "recommended", daysLeft: null };
}

const ACTION_TO_CONSEIL = {
  "tonte":    "tonte",
  "arrosage": "arrosage",
  "engrais":  "engrais",
  "aeration": "aeration",
};

export default function Today() {
  const navigate = useNavigate();
  const { weather, alerts } = useWeather();
  const { profile } = useProfile();
  const { history, addEntry } = useHistory();
  const { isPaid, isAdmin, isFree } = useSubscription();
  const [aiReco, setAiReco]       = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [justLogged, setJustLogged] = useState([]); // flash visuel uniquement

  const today = new Date();
  const month = today.getMonth() + 1;
  const plan  = MONTHLY_PLAN[month];
  const arros = profile && weather ? calcArrosage(month, profile, weather, history, getDebitMmH()) : null;

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

  useEffect(() => { if (weather && isPaid) fetchAI(); }, [weather, isPaid]); // eslint-disable-line

  const log = (rule) => {
    addEntry(rule.label);
    // Flash visuel 1.5s
    setJustLogged(p => [...p, rule.id]);
    setTimeout(() => setJustLogged(p => p.filter(x => x !== rule.id)), 1500);
    // GreenPoints + conseil
    const res     = gagnerPoints(rule.gp);
    const conseil = ACTION_TO_CONSEIL[rule.id]
      ? getConseilApresAction(ACTION_TO_CONSEIL[rule.id], mois, profile, null)
      : null;
    afficherToast(res, conseil);
  };

  // Calcul des statuts pour toutes les règles
  const actionStatuses = FREQ_RULES.map(rule => ({
    rule,
    ...getActionStatus(rule, month, history, arros),
  }));

  const recommended = actionStatuses.filter(a => a.status === "recommended");
  const tooSoon     = actionStatuses.filter(a => a.status === "done_today" || a.status === "too_soon");
  const offSeason   = actionStatuses.filter(a => a.status === "off_season");

  return (
    <div>
      {/* Header */}
      <div style={{ padding:"48px 20px 16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <img src="/mg360-mascot-transparent.png" alt="MG360" style={{ width:40, height:40, objectFit:"contain" }} />
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:"#F1F8F2" }}>Actions du jour</div>
              <div style={{ fontSize:12, color:"#66BB6A", marginTop:2 }}>{today.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
            </div>
          </div>
          {isAdmin && <div style={{ fontSize:11, color:"#f9a825" }}>👑 Admin</div>}
        </div>
        {isFree && <div style={{ fontSize:11, color:"#81c784", marginTop:4 }}>🆓 Accès gratuit · <span onClick={() => navigate("/subscribe")} style={{ color:"#66BB6A", cursor:"pointer", textDecoration:"underline" }}>Passer Premium</span></div>}
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
        {!isPaid && (<div style={{...card(),textAlign:"center",padding:14,background:"rgba(255,255,255,0.03)"}}><div style={{fontSize:13,color:"#81c784",marginBottom:8}}>🔒 Météo temps réel — Premium uniquement</div><button onClick={() => navigate("/subscribe")} style={{...btn.primary,width:"auto",padding:"8px 20px",fontSize:12}}>Passer Premium</button></div>)}

        {/* Alertes — Premium uniquement */}
        {isPaid && alerts.map((a,i) => <AlertBanner key={i} alert={a} />)}

        {/* Arrosage — Premium uniquement */}
        {isPaid && arros && (<div style={{...card(),background:"rgba(25,118,210,0.1)",border:"1px solid rgba(100,181,246,0.25)"}}><div style={cardTitle}><span>💧 Arrosage recommandé</span><span style={{ fontSize:11, color:"#64b5f6", background:"rgba(100,181,246,0.15)", borderRadius:20, padding:"2px 8px" }}>{arros.freq}x/semaine</span></div><div style={{display:"flex",gap:8}}>{[{val:`${arros.mm}mm`,label:"Dose session"},{val:`${arros.minutes}min`,label:"Durée"},{val:"5h–9h",label:"Horaire"}].map(({val,label}) => (<div key={label} style={{flex:1,background:"rgba(255,255,255,0.06)",borderRadius:12,padding:"10px 6px",textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:"#64b5f6"}}>{val}</div><div style={{fontSize:10,color:"#81c784"}}>{label}</div></div>))}</div><div style={{fontSize:11,color:"rgba(100,181,246,0.6)",textAlign:"center",marginTop:8}}>Débit configuré : {arros.debitMmH} mm/h — régler dans Paramètres</div></div>)}

        {/* IA Recommandations */}
        <div style={card()}><div style={cardTitle}><span>🤖 Recommandations IA</span>{isPaid && <button onClick={fetchAI} style={{background:"rgba(76,175,80,0.2)",border:"none",borderRadius:8,padding:"4px 10px",color:"#a5d6a7",fontSize:11,cursor:"pointer"}}>↻</button>}</div>{!isPaid ? (<div style={{textAlign:"center",padding:"16px 0"}}><div style={{fontSize:28,marginBottom:8}}>🔒</div><div style={{fontSize:13,color:"#81c784",marginBottom:12}}>Fonctionnalité Premium uniquement</div><button onClick={() => navigate("/subscribe")} style={{...btn.primary,width:"auto",padding:"10px 24px"}}>Passer Premium 🌿</button></div>) : aiLoading ? (<div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:28,display:"inline-block",animation:"spin 1.2s linear infinite"}}>🌿</div><div style={{fontSize:12,color:"#81c784",marginTop:8}}>Analyse en cours...</div></div>) : aiReco ? (<div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{aiReco}</div>) : (<div style={{fontSize:13,color:"#81c784",textAlign:"center",padding:"12px 0"}}>{!weather ? "Activez la géolocalisation" : "Appuyez sur ↻"}</div>)}</div>

        {/* ── JOURNALISATION ───────────────────────────────────────────────── */}
        <div style={card()}>
          <div style={cardTitle}>
            <span>✅ Journaliser</span>
            <span style={{ fontSize:11, color:"#81c784", background:"rgba(76,175,80,0.15)", borderRadius:20, padding:"2px 8px" }}>
              🌿 {gpTotal.toLocaleString("fr-FR")} pts
            </span>
          </div>

          {/* ── À faire aujourd'hui ── */}
          {recommended.length > 0 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#66BB6A", letterSpacing:0.8, marginBottom:8 }}>À FAIRE AUJOURD'HUI</div>
              {recommended.map(({ rule }) => {
                const isFlashing = justLogged.includes(rule.id);
                return (
                  <div key={rule.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:"#e8f5e9" }}>{rule.label}</div>
                      <div style={{ fontSize:11, color:"#81c784" }}>
                        {rule.id === "tonte"     && `Hauteur recommandée : ${plan?.hauteur || "25"} mm`}
                        {rule.id === "arrosage"  && arros && `${arros.freq}x/sem · ${arros.mm}mm · ${arros.minutes}min`}
                        {rule.id === "engrais"   && plan?.engrais && plan.engrais}
                        {!["tonte","arrosage","engrais"].includes(rule.id) && "Conseillé ce mois"}
                      </div>
                    </div>
                    <button
                      onClick={() => log(rule)}
                      style={{
                        background:    isFlashing ? "rgba(76,175,80,0.5)" : "rgba(76,175,80,0.2)",
                        border:        "1px solid rgba(76,175,80,0.5)",
                        borderRadius:  10,
                        padding:       "8px 14px",
                        color:         "#a5d6a7",
                        fontSize:      12,
                        fontWeight:    700,
                        cursor:        "pointer",
                        transition:    "background 0.2s",
                        minWidth:      72,
                        textAlign:     "center",
                      }}
                    >
                      {isFlashing ? "✓ Fait !" : "Faire →"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {recommended.length === 0 && (
            <div style={{ textAlign:"center", padding:"12px 0 8px", color:"#66BB6A", fontSize:13 }}>
              ✅ Tout est à jour pour aujourd'hui !
            </div>
          )}

          {/* ── Déjà fait / trop tôt ── */}
          {tooSoon.length > 0 && (
            <div style={{ marginTop:4 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#555", letterSpacing:0.8, marginBottom:8 }}>DÉJÀ FAIT / TROP TÔT</div>
              {tooSoon.map(({ rule, status, daysLeft }) => (
                <div key={rule.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", opacity:0.45 }}>
                  <div style={{ fontSize:12, color:"#81c784" }}>{rule.label}</div>
                  <div style={{ fontSize:11, color:"#555", background:"rgba(255,255,255,0.06)", borderRadius:8, padding:"3px 10px" }}>
                    {status === "done_today" ? "✓ Fait aujourd'hui" : `Dans ${daysLeft}j`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Hors saison ── */}
          {offSeason.length > 0 && (
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#444", letterSpacing:0.8, marginBottom:6 }}>HORS SAISON CE MOIS</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {offSeason.map(({ rule }) => (
                  <div key={rule.id} style={{ fontSize:11, color:"#444", background:"rgba(255,255,255,0.04)", borderRadius:8, padding:"4px 10px", opacity:0.35 }}>
                    {rule.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Plan du mois — inchangé */}
        <div style={card()}>
          <div style={cardTitle}><span>📅 Résumé {MONTHS_FR[month]}</span></div>
          {[
            { icon:"✂️", label:"Tonte",    val:plan.tonte,                                  produit:false },
            { icon:"🌱", label:"Engrais",  val:plan.engrais||"Aucun ce mois",               produit:!!plan.engrais },
            { icon:"🔧", label:"Verticut", val:plan.verticut?"À prévoir":"Non requis",       produit:!!plan.verticut },
            { icon:"🌀", label:"Aération", val:plan.aeration?"Recommandée":"Non requise",   produit:false },
          ].map(({icon,label,val,produit}) => (
            <div key={label} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize:16, minWidth:24 }}>{icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:"#81c784", fontWeight:700 }}>{label}</div>
                <div style={{ fontSize:13 }}>{val}</div>
              </div>
              {produit && (
                <button onClick={() => navigate("/products")} style={{ background:"rgba(76,175,80,0.2)", border:"1px solid rgba(76,175,80,0.4)", borderRadius:8, padding:"5px 10px", color:"#a5d6a7", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                  Acheter →
                </button>
              )}
            </div>
          ))}
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
