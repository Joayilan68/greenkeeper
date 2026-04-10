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

// ── Source unique de vérité : FREQ_RULES dérivées de MONTHLY_PLAN ─────────────
// mois[] alignés exactement sur MONTHLY_PLAN
// Les mois agronomiques (désherbage, anti-mousse, regarnissage, top-dressing)
// sont gardés séparément car non représentés dans MONTHLY_PLAN
const buildFreqRules = (profile) => {
  const isSynth = profile?.pelouse === "synthetique";
  const sol     = profile?.sol;

  return [
    {
      id:       "tonte",
      label:    "Tonte ✂️",
      gp:       "tonte",
      // Mois où tonte != "Aucune" dans MONTHLY_PLAN : 2-11
      // En pratique on exclut 2 (trop tôt) et 11 (rare) pour gazon standard
      mois:     isSynth ? [] : [3,4,5,6,7,8,9,10],
      interval: (m) => m >= 6 && m <= 8 ? 4 : m >= 3 && m <= 5 ? 5 : 7,
      keywords: ["tonte"],
      detail:   (plan) => `Hauteur : ${plan?.hauteur || "25"} mm`,
    },
    {
      id:          "arrosage",
      label:       "Arrosage 💧",
      gp:          "arrosage",
      // Mois où arrosage_base > 0 dans MONTHLY_PLAN : 2-10
      mois:        isSynth ? [] : [3,4,5,6,7,8,9,10],
      interval:    () => 1,
      keywords:    ["arrosage"],
      weatherDriven: true,
    },
    {
      id:       "engrais",
      label:    "Engrais 🌱",
      gp:       "engrais",
      // Mois avec engrais != null dans MONTHLY_PLAN : 3,4,5,6,7,8,9,11
      mois:     isSynth ? [] : [3,4,5,6,7,8,9,11],
      interval: () => 45,
      keywords: ["engrais"],
      detail:   (plan) => plan?.engrais || null,
    },
    {
      id:       "verticut",
      label:    "Scarification 🔩",
      gp:       "scarification",
      // Mois avec verticut:true dans MONTHLY_PLAN : 4,5,6
      mois:     isSynth ? [] : [4,5,6],
      interval: () => 180,
      keywords: ["scarif","verticut"],
    },
    {
      id:       "aeration",
      label:    "Aération 🌀",
      gp:       "aeration",
      // Mois avec aeration:true dans MONTHLY_PLAN : 2,3,9
      // Sol argileux ou compacté → on ajoute mai et octobre
      mois:     isSynth ? [] : (
        sol === "argileux" || sol === "compacte"
          ? [3,4,9,10]
          : [3,9]
      ),
      interval: () => 90,
      keywords: ["aeration","aération"],
    },
    {
      id:       "desherbage",
      label:    "Désherbage 🪴",
      gp:       "desherbage",
      // Agronomique : printemps et automne
      mois:     isSynth ? [] : [4,5,9],
      interval: () => 21,
      keywords: ["desherb","désherb"],
    },
    {
      id:       "regarnissage",
      label:    "Regarnissage 🌾",
      gp:       "semences",
      // Semis printemps + automne
      mois:     isSynth ? [] : [3,4,5,8,9],
      interval: () => 60,
      keywords: ["semences","semis","regarnissage"],
    },
    {
      id:       "topdressing",
      label:    "Top-dressing 🏖️",
      gp:       "aeration",
      mois:     isSynth ? [] : [3,4,9],
      interval: () => 90,
      keywords: ["top-dressing","topdressing","top_dressing"],
    },
    {
      id:       "antimousse",
      label:    "Anti-mousse 💊",
      gp:       "anti_mousse",
      mois:     isSynth ? [] : [3,4,9],
      interval: () => 30,
      keywords: ["anti_mousse","mousse","fongicide"],
    },
  ];
};

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

function getActionStatus(rule, month, history, arros) {
  if (!rule.mois.includes(month)) return { status: "off_season", daysLeft: null };
  if (rule.weatherDriven && !arros) return { status: "off_season", daysLeft: null };
  const since    = daysSince(history, rule.keywords);
  const interval = rule.interval(month);
  if (since === 0)       return { status: "done_today",  daysLeft: 0 };
  if (since < interval)  return { status: "too_soon",    daysLeft: interval - since };
  return { status: "recommended", daysLeft: null };
}

const ACTION_TO_CONSEIL = {
  tonte: "tonte", arrosage: "arrosage", engrais: "engrais", aeration: "aeration",
};

// Couleurs de la tuile Journaliser
const C = {
  cardBg:    "rgba(15,47,31,0.95)",
  cardBorder:"rgba(102,187,106,0.25)",
  todo:      "#66BB6A",
  todoBg:    "rgba(102,187,106,0.12)",
  soon:      "#81c784",
  soonOpacity: 0.5,
  none:      "#4a7c5c",
  noneOpacity: 0.3,
};

export default function Today() {
  const navigate  = useNavigate();
  const { weather, alerts } = useWeather();
  const { profile } = useProfile();
  const { history, addEntry } = useHistory();
  const { isPaid, isAdmin, isFree } = useSubscription();
  const [aiReco, setAiReco]       = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [justLogged, setJustLogged] = useState([]);

  const today = new Date();
  const month = today.getMonth() + 1;
  const plan  = MONTHLY_PLAN[month];
  const arros = profile && weather
    ? calcArrosage(month, profile, weather, history, getDebitMmH())
    : null;

  const { mois } = useSaison();
  const { gagnerPoints, total: gpTotal, palier } = useGreenPoints();
  const { actuel: streak, enDanger, message: streakMsg, enregistrerConnexion } = useStreak();
  const [toastPoints, setToastPoints] = useState(null);

  // FREQ_RULES générées selon le profil (source unique)
  const FREQ_RULES = buildFreqRules(profile);

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
  }, [weather, profile, month, arros, isPaid]); // eslint-disable-line

  useEffect(() => { if (weather && isPaid) fetchAI(); }, [weather, isPaid]); // eslint-disable-line

  const log = (rule) => {
    addEntry(rule.label);
    setJustLogged(p => [...p, rule.id]);
    setTimeout(() => setJustLogged(p => p.filter(x => x !== rule.id)), 1500);
    const res     = gagnerPoints(rule.gp);
    const conseil = ACTION_TO_CONSEIL[rule.id]
      ? getConseilApresAction(ACTION_TO_CONSEIL[rule.id], mois, profile, null)
      : null;
    afficherToast(res, conseil);
  };

  // Statuts calculés depuis la même source que le Résumé
  const actionStatuses = FREQ_RULES.map(rule => ({
    rule,
    ...getActionStatus(rule, month, history, arros),
  }));

  const recommended = actionStatuses.filter(a => a.status === "recommended");
  const prevoyez    = actionStatuses.filter(a => a.status === "done_today" || a.status === "too_soon");
  const pasPrevu    = actionStatuses.filter(a => a.status === "off_season");

  // Résumé du mois : toutes les actions actives ce mois (depuis FREQ_RULES)
  const resumeMois = FREQ_RULES.filter(r => r.mois.includes(month));

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

        {/* Streak */}
        {streak > 0 && (
          <div style={{ background:enDanger?"#fff3e0":"#e8f5e9", border:`1px solid ${enDanger?"#f9a825":"#a5d6a7"}`, borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <span style={{ fontSize:22 }}>{enDanger?"⚠️":"🔥"}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, color:enDanger?"#e65100":"#2e7d32", fontSize:14 }}>{streakMsg}</div>
              {enDanger && <div style={{ fontSize:11, color:"#f57c00" }}>Connecte-toi aujourd'hui pour garder ton streak !</div>}
            </div>
            <div style={{ background:"#e8f5e9", color:"#2e7d32", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:600 }}>
              {palier?.icone} {gpTotal.toLocaleString("fr-FR")} pts
            </div>
          </div>
        )}

        {/* Météo */}
        {isPaid && weather && (()=>{ const w=getWMO(weather.code); return (<div style={{...card(),background:"rgba(76,175,80,0.12)",border:"1px solid rgba(76,175,80,0.25)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:32,fontWeight:800}}>{Math.round(weather.temp_max)}°C</div><div style={{fontSize:13,color:"#81c784"}}>{w.label} · {weather.precip}mm</div><div style={{fontSize:11,color:"#81c784",opacity:0.7}}>Humidité {weather.humidity}% · Vent {weather.wind}km/h</div></div><div style={{fontSize:52}}>{w.icon}</div></div></div>); })()}
        {!isPaid && (<div style={{...card(),textAlign:"center",padding:14,background:"rgba(255,255,255,0.03)"}}><div style={{fontSize:13,color:"#81c784",marginBottom:8}}>🔒 Météo temps réel — Premium uniquement</div><button onClick={()=>navigate("/subscribe")} style={{...btn.primary,width:"auto",padding:"8px 20px",fontSize:12}}>Passer Premium</button></div>)}

        {/* Alertes */}
        {isPaid && alerts.map((a,i) => <AlertBanner key={i} alert={a} />)}

        {/* Arrosage Premium */}
        {isPaid && arros && (
          <div style={{...card(),background:"rgba(25,118,210,0.1)",border:"1px solid rgba(100,181,246,0.25)"}}>
            <div style={cardTitle}>
              <span>💧 Arrosage recommandé</span>
              <span style={{ fontSize:11, color:"#64b5f6", background:"rgba(100,181,246,0.15)", borderRadius:20, padding:"2px 8px" }}>{arros.freq}x/semaine</span>
            </div>
            <div style={{display:"flex",gap:8}}>
              {[{val:`${arros.mm}mm`,label:"mm/session"},{val:`${arros.minutes}min`,label:"min/session"},{val:"5h–9h",label:"Horaire"}].map(({val,label}) => (
                <div key={label} style={{flex:1,background:"rgba(255,255,255,0.06)",borderRadius:12,padding:"10px 6px",textAlign:"center"}}>
                  <div style={{fontSize:18,fontWeight:800,color:"#64b5f6"}}>{val}</div>
                  <div style={{fontSize:10,color:"#81c784"}}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:11,color:"rgba(100,181,246,0.6)",textAlign:"center",marginTop:8}}>
              ⚙️ Débit : {arros.debitMmH} mm/h — <span style={{textDecoration:"underline",cursor:"pointer"}} onClick={()=>navigate("/my-lawn")}>Calibrer dans Mon Gazon</span>
            </div>
          </div>
        )}

        {/* IA */}
        <div style={card()}><div style={cardTitle}><span>🤖 Recommandations IA</span>{isPaid && <button onClick={fetchAI} style={{background:"rgba(76,175,80,0.2)",border:"none",borderRadius:8,padding:"4px 10px",color:"#a5d6a7",fontSize:11,cursor:"pointer"}}>↻</button>}</div>{!isPaid?(<div style={{textAlign:"center",padding:"16px 0"}}><div style={{fontSize:28,marginBottom:8}}>🔒</div><div style={{fontSize:13,color:"#81c784",marginBottom:12}}>Fonctionnalité Premium uniquement</div><button onClick={()=>navigate("/subscribe")} style={{...btn.primary,width:"auto",padding:"10px 24px"}}>Passer Premium 🌿</button></div>):aiLoading?(<div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:28,display:"inline-block",animation:"spin 1.2s linear infinite"}}>🌿</div><div style={{fontSize:12,color:"#81c784",marginTop:8}}>Analyse en cours...</div></div>):aiReco?(<div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{aiReco}</div>):(<div style={{fontSize:13,color:"#81c784",textAlign:"center",padding:"12px 0"}}>{!weather?"Activez la géolocalisation":"Appuyez sur ↻"}</div>)}</div>

        {/* ── JOURNALISER ─────────────────────────────────────────────────── */}
        <div style={{ ...card(), background:C.cardBg, border:`1px solid ${C.cardBorder}` }}>
          <div style={cardTitle}>
            <span>✅ Journaliser</span>
            <span style={{ fontSize:11, color:"#66BB6A", background:"rgba(102,187,106,0.15)", borderRadius:20, padding:"2px 8px" }}>
              🌿 {gpTotal.toLocaleString("fr-FR")} pts
            </span>
          </div>

          {/* À FAIRE AUJOURD'HUI */}
          {recommended.length > 0 ? (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:800, color:C.todo, letterSpacing:1, marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:C.todo, display:"inline-block" }} />
                À FAIRE AUJOURD'HUI
              </div>
              {recommended.map(({ rule }) => {
                const isFlashing = justLogged.includes(rule.id);
                const detail = rule.detail ? rule.detail(plan) : null;
                return (
                  <div key={rule.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", marginBottom:6, background:"rgba(102,187,106,0.08)", borderRadius:10, border:"1px solid rgba(102,187,106,0.2)" }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#e8f5e9" }}>{rule.label}</div>
                      {detail && <div style={{ fontSize:11, color:"#81c784", marginTop:2 }}>{detail}</div>}
                      {rule.id === "arrosage" && arros && <div style={{ fontSize:11, color:"#64b5f6", marginTop:2 }}>{arros.freq}x/sem · {arros.mm}mm · {arros.minutes}min</div>}
                    </div>
                    <button
                      onClick={() => log(rule)}
                      style={{
                        background:   isFlashing ? "rgba(102,187,106,0.5)" : "rgba(102,187,106,0.2)",
                        border:       "1px solid rgba(102,187,106,0.5)",
                        borderRadius: 10, padding:"8px 14px",
                        color:"#a5d6a7", fontSize:12, fontWeight:700,
                        cursor:"pointer", minWidth:76, textAlign:"center",
                        transition:"background 0.2s",
                      }}
                    >
                      {isFlashing ? "✓ Fait !" : "Faire →"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:"14px 0", color:C.todo, fontSize:13, marginBottom:12 }}>
              ✅ Tout est à jour pour aujourd'hui !
            </div>
          )}

          {/* PRÉVOIR */}
          {prevoyez.length > 0 && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:800, color:C.soon, letterSpacing:1, marginBottom:8, display:"flex", alignItems:"center", gap:6, opacity:C.soonOpacity * 2 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:C.soon, display:"inline-block" }} />
                PRÉVOIR
              </div>
              {prevoyez.map(({ rule, status, daysLeft }) => (
                <div key={rule.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 10px", marginBottom:4, borderRadius:8, background:"rgba(255,255,255,0.03)", opacity:C.soonOpacity }}>
                  <div style={{ fontSize:12, color:"#a5d6a7" }}>{rule.label}</div>
                  <div style={{ fontSize:11, color:"#81c784", background:"rgba(255,255,255,0.06)", borderRadius:8, padding:"3px 10px", whiteSpace:"nowrap" }}>
                    {status === "done_today" ? "✓ Fait aujourd'hui" : `Dans ${daysLeft}j`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PAS PRÉVU */}
          {pasPrevu.length > 0 && (
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:C.none, letterSpacing:1, marginBottom:6, opacity:C.noneOpacity * 3 }}>
                PAS PRÉVU CE MOIS
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                {pasPrevu.map(({ rule }) => (
                  <div key={rule.id} style={{ fontSize:11, color:"#3a6b4a", background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"3px 10px", opacity:C.noneOpacity }}>
                    {rule.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RÉSUMÉ DU MOIS ────────────────────────────────────────────────
            Dérivé des FREQ_RULES (même source que Journaliser)
            → cohérence garantie avec la tuile Journaliser et MyLawn
        ─────────────────────────────────────────────────────────────────── */}
        <div style={card()}>
          <div style={cardTitle}><span>📅 Plan {MONTHS_FR[month]}</span></div>

          {resumeMois.length === 0 ? (
            <div style={{ fontSize:13, color:"#81c784", textAlign:"center", padding:"12px 0" }}>Repos — aucune action planifiée ce mois</div>
          ) : (
            resumeMois.map((rule) => {
              const status = actionStatuses.find(a => a.rule.id === rule.id)?.status;
              const isActive  = status === "recommended";
              const isDone    = status === "done_today";
              const isTooSoon = status === "too_soon";

              // Détail spécifique à chaque action
              let detail = null;
              if (rule.id === "tonte")    detail = `${plan.tonte} · ${plan.hauteur} mm`;
              if (rule.id === "engrais")  detail = plan.engrais;
              if (rule.id === "arrosage") detail = arros
                ? `${arros.freq}x/sem · ${arros.mm}mm/session · ${arros.minutes}min`
                : `${plan.arrosage_freq}x/semaine recommandé`;
              if (rule.id === "verticut") detail = "Scarification / passage verticut";
              if (rule.id === "aeration") detail = "Aération ou carottage";
              if (rule.id === "desherbage")   detail = "Désherbant sélectif";
              if (rule.id === "regarnissage") detail = "Semences sur zones clairsemées";
              if (rule.id === "topdressing")  detail = "Sable fin + terreau";
              if (rule.id === "antimousse")   detail = "Traitement anti-mousse";

              const statusBadge = isDone
                ? { label:"✓ Fait", color:"#66BB6A", bg:"rgba(102,187,106,0.15)" }
                : isTooSoon
                ? { label:"Planifié", color:"#81c784", bg:"rgba(102,187,106,0.08)" }
                : isActive
                ? { label:"À faire", color:"#f9a825", bg:"rgba(249,168,37,0.15)" }
                : { label:"Ce mois", color:"#81c784", bg:"rgba(102,187,106,0.08)" };

              const needsProduct = (rule.id === "engrais" || rule.id === "verticut" || rule.id === "antimousse" || rule.id === "topdressing") && isActive;

              return (
                <div key={rule.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                      <span style={{ fontSize:13, fontWeight:700 }}>{rule.label}</span>
                      <span style={{ fontSize:10, color:statusBadge.color, background:statusBadge.bg, borderRadius:20, padding:"1px 7px", fontWeight:700 }}>
                        {statusBadge.label}
                      </span>
                    </div>
                    {detail && <div style={{ fontSize:11, color:"#81c784" }}>{detail}</div>}
                  </div>
                  {needsProduct && (
                    <button onClick={() => navigate("/products")} style={{ background:"rgba(76,175,80,0.2)", border:"1px solid rgba(76,175,80,0.4)", borderRadius:8, padding:"5px 10px", color:"#a5d6a7", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                      Acheter →
                    </button>
                  )}
                </div>
              );
            })
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
