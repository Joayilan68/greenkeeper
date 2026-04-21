import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWeather } from "../lib/useWeather";
import { useProfile } from "../lib/useProfile";
import { useHistory } from "../lib/useHistory";
import { useAuth } from "@clerk/clerk-react";
import { useSubscription } from "../lib/useSubscription";
import { MONTHLY_PLAN, MONTHS_FR, calcArrosage, getWMO, getDebitMmH } from "../lib/lawn";
import { buildActions, zoneClimatique, ZONE_LABELS } from "../lib/planEntretien";
import { calcLawnScore } from "../lib/lawnScore";
import AlertBanner from "../components/AlertBanner";
import ProductCard from "../components/ProductCard";
import { card, cardTitle, btn, scroll } from "../lib/styles";
import { useGreenPoints } from "../lib/useGreenPoints";
import { useStreak } from "../lib/useStreak";
import { getConseilApresAction } from "../lib/useRecommandations";
import { useSaison } from "../lib/useSaison";

// Mapping action.id → clé amazonProducts.js
const ACTION_TO_AMAZON = {
  engrais_starter: "engraisStarter",
  engrais_ete:     "engraisEte",
  engrais_automne: "engraisAutomne",
  engrais_hiver:   "engraisHiver",
  anti_mousse:     "antiMousse",
  desherbage:      "desherbage",
  aeration:        "aeration",
  verticut:        "verticut",
  regarnissage:    "regarnissage",
  biostimulant:    "biostimulant",
};

// Mapping action id → clé conseil post-action
const CONSEILS_MAP = {
  tonte:           "tonte",
  arrosage:        "arrosage",
  engrais_starter: "engrais",
  engrais_ete:     "engrais",
  engrais_automne: "engrais",
  engrais_hiver:   "engrais",
  aeration:        "aeration",
};

// ── Composant bouton géolocalisation ─────────────────────────────────────────
function GeolocButton({ navigate }) {
  const [refused, setRefused] = React.useState(false);

  const handleClick = () => {
    if (!navigator.geolocation) {
      setRefused(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          localStorage.setItem("gk_location", JSON.stringify({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          }));
          window.location.reload();
        } catch {}
      },
      () => setRefused(true) // Permission refusée → afficher aide
    );
  };

  if (refused) return (
    <div style={{
      background: "rgba(244,162,97,0.1)", border: "1px solid rgba(244,162,97,0.3)",
      borderRadius: 12, padding: "14px 16px", marginBottom: 8, textAlign: "left",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#f4a261", marginBottom: 8 }}>
        📍 Géolocalisation bloquée
      </div>
      <div style={{ fontSize: 12, color: "#95d5b2", lineHeight: 1.7, marginBottom: 12 }}>
        Votre navigateur a bloqué l'accès à votre position. Pour l'activer :
        <br />• <strong>Chrome</strong> : cliquez sur le 🔒 dans la barre d'adresse → Autoriser
        <br />• <strong>Safari</strong> : Réglages → Confidentialité → Service de localisation
        <br />• <strong>Firefox</strong> : cliquez sur le 🛡️ dans la barre d'adresse
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={handleClick}
          style={{ background: "linear-gradient(135deg,#1565c0,#0d47a1)", color: "#fff",
            fontWeight: 800, border: "none", borderRadius: 10, padding: "8px 16px",
            fontSize: 12, cursor: "pointer" }}
        >
          🔄 Réessayer
        </button>
        <button
          onClick={() => navigate("/parametres")}
          style={{ background: "rgba(255,255,255,0.08)", color: "#95d5b2",
            fontWeight: 700, border: "1px solid rgba(149,213,178,0.3)", borderRadius: 10,
            padding: "8px 16px", fontSize: 12, cursor: "pointer" }}
        >
          ⚙️ Paramètres
        </button>
      </div>
    </div>
  );

  return (
    <button
      onClick={handleClick}
      style={{ background: "linear-gradient(135deg,#1565c0,#0d47a1)", color: "#fff",
        fontWeight: 800, border: "none", borderRadius: 10, padding: "10px 24px",
        fontSize: 13, cursor: "pointer", width: "auto", marginBottom: 8 }}
    >
      📍 Activer la géolocalisation
    </button>
  );
}

export default function Today() {
  const navigate = useNavigate();
  const { weather, alerts } = useWeather();
  const { profile }         = useProfile();
  const { history, addEntry } = useHistory();
  const { getToken } = useAuth();
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

  // ── Score et zone ─────────────────────────────────────────────────────────
  const score = profile ? calcLawnScore(profile, history, weather) : 70;
  const zone  = zoneClimatique(profile);

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

  // ── Calcul des statuts (source unique planEntretien.js) ───────────────────
  // Déclaré AVANT fetchAI pour éviter la TDZ (Temporal Dead Zone) en prod Vite
  const actionStatuses = buildActions(profile, weather, history, score, month, arros);
  const recommended = actionStatuses.filter(a => a.status === "recommended");
  const prevoyez    = actionStatuses.filter(a =>
    a.status === "done_today" || a.status === "too_soon" ||
    a.status === "blocked"    || a.status === "exclusive"
  );
  const pasPrevu    = actionStatuses.filter(a => a.status === "off_season");

  // ── Clé localStorage IA du jour ─────────────────────────────────────────
  const AI_RECO_KEY = "mg360_ai_reco_today";
  // Ref : empêche les appels multiples (closure stale proof)
  const aiCalledRef = React.useRef(false);

  // ── Fonction d'appel API IA ───────────────────────────────────────────────
  // Pas de useCallback — évite les closures stales sur weather/recommended
  const fetchAI = async () => {
    if (!isPaid) return;
    setAiLoading(true);

    const isSynth   = profile?.pelouse === "synthetique" || profile?.isSynthetique;
    const zoneLabel = ZONE_LABELS[zone] || zone;
    const actionsAFaire   = recommended.map(a => a.action.label);
    const actionsBloquees = actionStatuses
      .filter(a => a.status === "blocked" || a.status === "too_soon")
      .map(a => `${a.action.label} (${a.blockedReason || `dans ${a.daysLeft}j`})`);

    const prompt = isSynth
      ? [
          `Tu es un expert gazon synthétique pour Mongazon360.`,
          `IMPORTANT: gazon SYNTHÉTIQUE — ne jamais recommander tonte, engrais, arrosage, désherbage, scarification, aération.`,
          `Profil: surface=${profile?.surface || "?"}m² expo=${profile?.exposition || "?"} zone=${zoneLabel}.`,
          weather ? `Météo: ${weather.temp_max}°C ${weather.precip}mm pluie.` : "",
          `Donne 3-4 conseils d'entretien synthétique (nettoyage, brossage, drainage, UV). Emojis, français, concis.`,
        ].filter(Boolean).join(" ")
      : [
          `Tu es un expert gazon pour Mongazon360. Enrichis les recommandations du jour.`,
          `Profil: type=${profile?.pelouse||"?"} sol=${profile?.sol||"?"} expo=${profile?.exposition||"?"} surface=${profile?.surface||"?"}m² score=${score}/100 zone=${zoneLabel}.`,
          `Date: ${today.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})} — ${plan?.label}.`,
          weather
            ? `Météo: ${weather.temp_max}°C/${weather.temp_min}°C ${weather.precip}mm pluie humidité ${weather.humidity}% vent ${weather.wind}km/h.`
            : `Pas de météo locale — conseille selon le profil.`,
          arros ? `Arrosage: ${arros.mm}mm/session ${arros.minutes}min ${arros.freq}x/sem.` : "",
          actionsAFaire.length > 0
            ? `ACTIONS DU JOUR: ${actionsAFaire.join(", ")}. Enrichis ces actions uniquement (timing, dosage, technique). Ne propose pas d'autres actions.`
            : `Aucune action prioritaire. Donne 2-3 conseils de vigilance.`,
          actionsBloquees.length > 0
            ? `Bloquées (ne pas recommander): ${actionsBloquees.join(", ")}.`
            : "",
          `4-5 points max, emojis, français.`,
        ].filter(Boolean).join(" ");

    try {
      const token = await getToken();
      const res   = await fetch("/api/ai-recommendations", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt }),
      });

      if (res.status === 429) {
        // Limite atteinte — afficher dernière reco en cache + message reset
        try {
          const saved = JSON.parse(localStorage.getItem(AI_RECO_KEY) || "{}");
          if (saved.text) {
            setAiReco(saved.text);
          } else {
            // Pas de cache → message explicite
            setAiReco("⏳ Limite quotidienne atteinte. Revenez demain pour une nouvelle recommandation IA.");
          }
        } catch {
          setAiReco("⏳ Limite quotidienne atteinte. Revenez demain pour une nouvelle recommandation IA.");
        }
        setAiLoading(false);
        return;
      }

      const data = await res.json();
      const text = data.text || "";
      if (text) {
        setAiReco(text);
        localStorage.setItem(AI_RECO_KEY, JSON.stringify({
          date: new Date().toISOString().slice(0, 10),
          text,
        }));
      }
    } catch {
      // Erreur réseau — silencieux si déjà une reco affichée
      if (!aiReco) setAiReco("Impossible de contacter l'IA.");
    }
    setAiLoading(false);
  };

  // ── Trigger 1 : dès que weather est disponible (cas normal) ──────────────
  useEffect(() => {
    if (!isPaid || !weather || aiCalledRef.current) return;
    aiCalledRef.current = true;
    try {
      const saved    = JSON.parse(localStorage.getItem(AI_RECO_KEY) || "{}");
      const todayStr = new Date().toISOString().slice(0, 10);
      if (saved.date === todayStr && saved.text) {
        setAiReco(saved.text); // Cache du jour → pas d'appel API
      } else {
        fetchAI();
      }
    } catch { fetchAI(); }
  }, [isPaid, weather]); // eslint-disable-line

  // ── Trigger 2 : fallback 3s pour utilisateurs sans géolocalisation ────────
  useEffect(() => {
    if (!isPaid) return;
    const timer = setTimeout(() => {
      if (aiCalledRef.current) return; // Déjà déclenché via weather
      aiCalledRef.current = true;
      try {
        const saved    = JSON.parse(localStorage.getItem(AI_RECO_KEY) || "{}");
        const todayStr = new Date().toISOString().slice(0, 10);
        if (saved.date === todayStr && saved.text) {
          setAiReco(saved.text);
        } else {
          fetchAI(); // fetchAI gère le cas weather=null
        }
      } catch { fetchAI(); }
    }, 3000);
    return () => clearTimeout(timer);
  }, [isPaid]); // eslint-disable-line

  // ── Journalisation ────────────────────────────────────────────────────────
  const log = (action) => {
    addEntry(action.label);
    setJustLogged(p => [...p, action.id]);
    setTimeout(() => setJustLogged(p => p.filter(x => x !== action.id)), 1500);
    const res     = gagnerPoints(action.gp);
    const consKey = CONSEILS_MAP[action.id];
    const conseil = consKey ? getConseilApresAction(consKey, mois, profile, score) : null;
    afficherToast(res, conseil);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ padding:"48px 20px 16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <img src="/mg360-mascot-transparent.png" alt="MG360" style={{ width:40, height:40, objectFit:"contain" }} />
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:"#F1F8F2" }}>Actions du jour</div>
              <div style={{ fontSize:12, color:"#66BB6A", marginTop:2 }}>
                {today.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
            {isAdmin && <div style={{ fontSize:11, color:"#f9a825" }}>👑 Admin</div>}
            {zone && <div style={{ fontSize:10, color:"#4a7c5c", background:"rgba(255,255,255,0.05)", borderRadius:20, padding:"2px 8px" }}>📍 {ZONE_LABELS[zone]}</div>}
          </div>
        </div>
        {isFree && (
          <div style={{ fontSize:11, color:"#81c784", marginTop:4 }}>
            🆓 Accès gratuit · <span onClick={() => navigate("/subscribe")} style={{ color:"#F59E0B", cursor:"pointer", fontWeight:700 }}>Passer Premium</span>
          </div>
        )}
      </div>

      <div style={scroll}>



        {/* Météo — Premium uniquement */}
        {isPaid && weather && (()=>{ const w=getWMO(weather.code); return (
          <div style={{...card(),background:"rgba(76,175,80,0.12)",border:"1px solid rgba(76,175,80,0.25)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:32,fontWeight:800}}>{Math.round(weather.temp_max)}°C</div>
                <div style={{fontSize:13,color:"#81c784"}}>{w.label} · {weather.precip}mm précip.</div>
                <div style={{fontSize:11,color:"#81c784",opacity:0.7}}>Humidité {weather.humidity}% · Vent {weather.wind}km/h</div>
              </div>
              <div style={{fontSize:52}}>{w.icon}</div>
            </div>
          </div>
        ); })()}
        {!isPaid && (
          <div style={{...card(),textAlign:"center",padding:14,background:"rgba(255,255,255,0.03)"}}>
            <div style={{fontSize:13,color:"#81c784",marginBottom:8}}>🔒 Météo temps réel — Premium uniquement</div>
            <button onClick={()=>navigate("/subscribe")} style={{background:"linear-gradient(135deg,#F59E0B,#D97706)",color:"#1a1a1a",fontWeight:800,border:"none",borderRadius:10,padding:"8px 20px",fontSize:12,cursor:"pointer",width:"auto"}}>Passer Premium</button>
          </div>
        )}

        {/* Alertes météo */}
        {isPaid && alerts.map((a,i) => <AlertBanner key={i} alert={a} />)}

        {/* Arrosage détaillé — Premium */}
        {isPaid && arros && (
          <div style={{...card(),background:"rgba(25,118,210,0.1)",border:"1px solid rgba(100,181,246,0.25)"}}>
            <div style={cardTitle}>
              <span>💧 Arrosage recommandé</span>
              <span style={{ fontSize:11, color:"#64b5f6", background:"rgba(100,181,246,0.15)", borderRadius:20, padding:"2px 8px" }}>
                {arros.freq}x/semaine
              </span>
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
              ⚙️ Débit : {arros.debitMmH} mm/h · Précipitations du jour déduites
            </div>
          </div>
        )}

        {/* Recommandations IA */}
        <div style={card()}>
          <div style={cardTitle}>
            <span>🤖 Recommandations IA</span>
            {isPaid && <button onClick={fetchAI} style={{background:"rgba(76,175,80,0.2)",border:"none",borderRadius:8,padding:"4px 10px",color:"#a5d6a7",fontSize:11,cursor:"pointer"}}>↻</button>}
          </div>
          {!isPaid ? (
            <div style={{textAlign:"center",padding:"16px 0"}}>
              <div style={{fontSize:28,marginBottom:8}}>🔒</div>
              <div style={{fontSize:13,color:"#81c784",marginBottom:12}}>Fonctionnalité Premium uniquement</div>
              <button onClick={()=>navigate("/subscribe")} style={{background:"linear-gradient(135deg,#F59E0B,#D97706)",color:"#1a1a1a",fontWeight:800,border:"none",borderRadius:10,padding:"10px 24px",fontSize:14,cursor:"pointer",width:"auto"}}>Passer Premium 🌿</button>
            </div>
          ) : !weather ? (
            <div style={{textAlign:"center",padding:"16px 0"}}>
              <div style={{fontSize:28,marginBottom:8}}>📍</div>
              <div style={{fontSize:13,color:"#81c784",marginBottom:12}}>
                Activez la géolocalisation pour des recommandations adaptées à votre météo locale.
              </div>
              <GeolocButton navigate={navigate} />
              {aiReco && (
                <div style={{marginTop:12,fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap",textAlign:"left"}}>
                  {aiReco}
                </div>
              )}
              {!aiReco && isPaid && (
                <div style={{marginTop:8}}>
                  <button onClick={fetchAI} style={{background:"rgba(76,175,80,0.15)",border:"1px solid rgba(76,175,80,0.3)",borderRadius:10,padding:"8px 18px",color:"#a5d6a7",fontSize:12,cursor:"pointer"}}>
                    🤖 Recommandations sans météo
                  </button>
                </div>
              )}
            </div>
          ) : aiLoading ? (
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:28,display:"inline-block",animation:"spin 1.2s linear infinite"}}>🌿</div>
              <div style={{fontSize:12,color:"#81c784",marginTop:8}}>Analyse en cours...</div>
            </div>
          ) : aiReco ? (
            <div style={{fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{aiReco}</div>
          ) : (
            <div style={{fontSize:13,color:"#81c784",textAlign:"center",padding:"12px 0"}}>
              Appuyez sur ↻ pour obtenir vos recommandations
            </div>
          )}
        </div>

        {/* ── JOURNALISER ─────────────────────────────────────────────────── */}
        <div style={{ ...card(), background:"rgba(15,47,31,0.95)", border:"1px solid rgba(102,187,106,0.25)" }}>
          <div style={cardTitle}>
            <span>✅ Journaliser</span>
            <span style={{ fontSize:11, color:"#66BB6A", background:"rgba(102,187,106,0.15)", borderRadius:20, padding:"2px 8px" }}>
              🌿 {gpTotal.toLocaleString("fr-FR")} pts
            </span>
          </div>

          {/* À FAIRE AUJOURD'HUI */}
          {recommended.length > 0 ? (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:800, color:"#66BB6A", letterSpacing:1, marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#66BB6A", display:"inline-block" }} />
                À FAIRE AUJOURD'HUI
              </div>
              {recommended.map(({ action }) => {
                const isFlashing   = justLogged.includes(action.id);
                const detail       = action.detail?.(plan, arros, profile, month, zone);
                const amazonKey    = ACTION_TO_AMAZON[action.id];
                return (
                  <div key={action.id} style={{ marginBottom:8 }}>
                    {/* Ligne action + bouton journaliser */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", background:"rgba(102,187,106,0.08)", borderRadius:10, border:"1px solid rgba(102,187,106,0.2)" }}>
                      <div style={{ flex:1, marginRight:10 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#e8f5e9" }}>{action.label}</div>
                        {detail && <div style={{ fontSize:11, color:"#81c784", marginTop:2 }}>{detail}</div>}
                      </div>
                      <button
                        onClick={() => log(action)}
                        style={{
                          background:   isFlashing ? "rgba(102,187,106,0.5)" : "rgba(102,187,106,0.2)",
                          border:       "1px solid rgba(102,187,106,0.5)",
                          borderRadius: 10, padding:"8px 14px",
                          color:"#a5d6a7", fontSize:12, fontWeight:700,
                          cursor:"pointer", minWidth:76, textAlign:"center",
                          transition:"background 0.2s", flexShrink:0,
                        }}
                      >
                        {isFlashing ? "✓ Fait !" : "Faire →"}
                      </button>
                    </div>
                    {/* Produit Amazon — si action a un produit et que le profil est chargé */}
                    {amazonKey && profile && (
                      <div style={{ marginTop:4 }}>
                        <ProductCard actionKey={amazonKey} profile={profile} compact />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:"14px 0", color:"#66BB6A", fontSize:13, marginBottom:12 }}>
              ✅ Tout est à jour pour aujourd'hui !
            </div>
          )}

          {/* PRÉVOIR */}
          {prevoyez.length > 0 && (
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:800, color:"#a5d6a7", letterSpacing:1, marginBottom:8 }}>
                PRÉVOIR
              </div>
              {prevoyez.map(({ action, status, daysLeft, blockedReason, exclusiveWith }) => {
                const badgeStyle = status === "done_today"
                  ? { color:"#4ade80", bg:"rgba(74,222,128,0.15)", border:"rgba(74,222,128,0.3)" }
                  : status === "too_soon"
                  ? { color:"#fbbf24", bg:"rgba(251,191,36,0.15)", border:"rgba(251,191,36,0.3)" }
                  : { color:"#f87171", bg:"rgba(248,113,113,0.15)", border:"rgba(248,113,113,0.3)" };
                const badgeText =
                  status === "done_today" ? "✓ Fait aujourd'hui" :
                  status === "too_soon"   ? `Dans ${daysLeft}j` :
                  status === "blocked"    ? `⛔ ${blockedReason?.split(" — ")[0] || "Bloqué"}` :
                  `⚠️ Excl. ${daysLeft}j`;
                return (
                  <div key={action.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 12px", marginBottom:5, borderRadius:9, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#c8e6c9" }}>{action.label}</div>
                    <div style={{ fontSize:11, fontWeight:700, color:badgeStyle.color, background:badgeStyle.bg, border:`1px solid ${badgeStyle.border}`, borderRadius:8, padding:"3px 10px", whiteSpace:"nowrap", marginLeft:8 }}>
                      {badgeText}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PAS PRÉVU CE MOIS */}
          {pasPrevu.length > 0 && (
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:"#81c784", letterSpacing:1, marginBottom:6 }}>
                PAS PRÉVU CE MOIS
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                {pasPrevu.map(({ action }) => (
                  <div key={action.id} style={{ fontSize:12, color:"#81c784", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"4px 11px" }}>
                    {action.label}
                  </div>
                ))}
              </div>
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
