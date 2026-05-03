import { useNavigate } from "react-router-dom";
import { useUser, UserButton } from "@clerk/clerk-react";
import { useWeather } from "../lib/useWeather";
import { useProfile } from "../lib/useProfile";
import { useHistory } from "../lib/useHistory";
import { useSubscription } from "../lib/useSubscription";
import { MONTHLY_PLAN, MONTHS_FR, getWMO } from "../lib/lawn";
import { calcLawnScore } from "../lib/lawnScore";
import { usePushNotifications } from "../lib/usePushNotifications";
import AlertBanner from "../components/AlertBanner";
import OnboardingModal from "../components/OnboardingModal";
import { card, cardTitle, btn, scroll } from "../lib/styles";
import { useState, useEffect } from "react";
import { useGreenPoints } from "../lib/useGreenPoints";
import { useStreak } from "../lib/useStreak";
import { useClassement } from "../lib/useClassement";
import { useSaison } from "../lib/useSaison";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { weather, location, locationName, alerts = [], loading, locLoading, refreshLocation } = useWeather() || {};
  const { profile, saveProfile, synced } = useProfile();
  const { history = [] } = useHistory();
  const { isPaid = false, isAdmin = false } = useSubscription() || {};
  const [showIssues, setShowIssues]   = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { permission, subscribe, sendTestNotification, sendAlert, isSupported } = usePushNotifications(user?.id);

  // ── Nouveaux hooks ──────────────────────────────────────────────────────────
  const { classementActif } = useSaison();
  const { total: gpTotal, palier, prochainPalier, progressPalier, historique: gpHistorique } = useGreenPoints();
  const { actuel: streak, enDanger, modeHiver } = useStreak();
  const {
    ligueActuelle, position, totalJoueurs, pointsSemaine,
    enZonePromotion, enZoneRetrogradation, joursRestants, messageClassement
  } = useClassement(gpHistorique, profile, isPaid);

  useEffect(() => {
    // Attendre la sync Supabase avant de décider — évite faux positif après vidage cache
    if (!synced) return;
    const done = localStorage.getItem("mg360_onboarding_done") || localStorage.getItem("gk_onboarding_done");
    if (!done && !profile) setTimeout(() => setShowOnboarding(true), 800);
    // Si profil existant → marquer onboarding comme fait
    if (profile && !done) {
      localStorage.setItem("mg360_onboarding_done", "true");
    }
  }, [profile, synced]);

  const GAZON_LABELS = {
    sport: "Sport / résistant", ombre: "Ombre / mi-ombre", sec: "Sec / méditerranéen",
    ornemental: "Ornemental", universel: "Universel / mélange", chaud: "Gazon chaud",
    synthetique: "Gazon synthétique", inconnu: "Non défini",
    // Rétrocompat anciens ids
    "ray-grass": "Ray-grass", fetuque: "Fétuque", kikuyu: "Kikuyu",
    bermuda: "Bermuda", paturin: "Pâturin", zoysia: "Zoysia", mixte: "Mélange",
  };

  const gazonDisplay = profile?.pelouse ? (GAZON_LABELS[profile.pelouse] || profile.pelouse) : null;

  const today = new Date();
  const month = today.getMonth() + 1;
  const plan  = MONTHLY_PLAN[month];

  const { score, potential, label, color, issues, strengths, diagScore, diagEmoji, diagAge, diagInfluence, hasDiag }
    = calcLawnScore({ weather, profile, history, month });

  const handleActivatePush = async () => {
    const success = await subscribe();
    if (success) {
      await sendTestNotification();
      // Synchroniser le consentement avec Settings
      try {
        const saved = localStorage.getItem("mg360_consents");
        const existing = saved ? JSON.parse(saved) : {};
        localStorage.setItem("mg360_consents", JSON.stringify({
          ...existing,
          notifications: true,
          lastUpdated: new Date().toISOString(),
        }));
      } catch {}
    }
  };

  const handleOnboardingComplete = (newProfile) => {
    saveProfile(newProfile);
    setShowOnboarding(false);
  };

  // ── Historique score ──────────────────────────────────────────────────────
  const [period, setPeriod] = useState("7j");
  const scoreHistory = (() => {
    const days = period === "30j" ? 30 : 7;
    const pts = [];
    for (let i = days; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const h = history.filter(e => {
        const [dd,mm,yy] = (e.date||"").split("/");
        return new Date(yy,mm-1,dd) <= d;
      });
      pts.push({ day: i === 0 ? "Aujourd'hui" : `Il y a ${days}j`, score: calcLawnScore({ weather, profile, history: h, month }).score });
    }
    return pts;
  })();
  const tontes    = history.filter(h => h.action?.toLowerCase().includes("tonte")).length;
  const arrosages = history.filter(h => h.action?.toLowerCase().includes("arrosage")).length;
  const engrais   = history.filter(h => h.action?.toLowerCase().includes("engrais")).length;
  const minScore  = Math.min(...scoreHistory.map(p => p.score));
  const maxScore  = Math.max(...scoreHistory.map(p => p.score));
  const scoreRange = maxScore - minScore || 1;

  return (
    <div>
      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div style={{ padding:"52px 20px 16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <UserButton appearance={{ variables: { colorPrimary:"#43a047" } }} />
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:"#F1F8F2", lineHeight:1.1 }}>
                Bonjour <span style={{ color:"#66BB6A" }}>{user?.firstName || ""}</span> 👋
              </div>
              <div style={{ fontSize:11, color:"#81c784", marginTop:2 }}>
                {today.toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" })}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {isAdmin && (
              <button onClick={() => navigate("/pilotage")} style={{ background:"rgba(249,168,37,0.2)", border:"1px solid rgba(249,168,37,0.3)", borderRadius:10, padding:"8px 10px", color:"#f9a825", fontSize:14, cursor:"pointer" }}>📊</button>
            )}
            <button onClick={() => navigate("/parametres")} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:10, padding:"8px 10px", color:"#A5D6A7", fontSize:14, cursor:"pointer" }}>⚙️</button>
          </div>
        </div>
        <div style={{ fontSize:11, color:"#81c784", fontStyle:"italic", opacity:0.8 }}>🌿 Prêt à prendre soin de ton gazon aujourd'hui ?</div>
        {isAdmin && <div style={{ fontSize:11, color:"#f9a825", marginTop:4, textAlign:"center" }}>👑 Mode Admin</div>}
      </div>

      <div style={scroll}>

        {/* ── NOTIF PUSH ────────────────────────────────────────────────────── */}
        {isSupported && isPaid && permission !== "granted" && (
          <div style={{ background:"linear-gradient(135deg,rgba(27,94,32,0.6),rgba(13,43,26,0.8))", border:"1px solid rgba(102,187,106,0.35)", borderRadius:14, padding:"14px 16px", marginBottom:4, display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:24, flexShrink:0 }}>🔔</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#F1F8F2", marginBottom:3 }}>Activez les alertes</div>
              <div style={{ fontSize:12, color:"#81c784", lineHeight:1.5 }}>Recevez vos rappels d'entretien même app fermée.</div>
            </div>
            <button onClick={handleActivatePush} style={{ flexShrink:0, padding:"8px 14px", borderRadius:10, background:"linear-gradient(135deg,#43a047,#2e7d32)", border:"none", color:"#fff", fontWeight:800, fontSize:12, cursor:"pointer" }}>Activer</button>
          </div>
        )}

        {/* ── BANNIÈRE VILLE NON VÉRIFIÉE ────────────────────────────────── */}
        {profile?.cityNotFound && (
          <div style={{ background:"rgba(230,81,0,0.15)", border:"1px solid rgba(239,108,0,0.4)", borderRadius:14, padding:"12px 14px", marginBottom:4, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:22 }}>📍</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#f9a825", marginBottom:2 }}>Ville introuvable — météo désactivée</div>
              <div style={{ fontSize:12, color:"#81c784", lineHeight:1.5 }}>"{profile.ville}" n'a pas pu être localisée. Corrigez votre ville.</div>
            </div>
            <button onClick={() => setShowOnboarding(true)} style={{ background:"rgba(239,108,0,0.3)", border:"1px solid rgba(239,108,0,0.5)", borderRadius:10, padding:"6px 12px", color:"#f9a825", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>Corriger →</button>
          </div>
        )}

        {/* ── LIGNE 1 : SCORE + MÉTÉO ────────────────────────────────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:4 }}>

          {/* Score */}
          <div style={{ ...card(), background:"linear-gradient(135deg,rgba(27,94,32,0.4),rgba(13,43,26,0.6))", border:`1px solid ${color}44`, padding:14 }}>
            <div style={{ fontSize:10, color:"#66BB6A", fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:8, textAlign:"center" }}>🌿 Score Santé</div>
            <div style={{ textAlign:"center" }}>
              <svg width="110" height="65" viewBox="0 0 140 80">
                <path d="M 10 75 A 60 60 0 0 1 130 75" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" strokeLinecap="round"/>
                <path d="M 10 75 A 60 60 0 0 1 130 75" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(score/100)*188} 188`}/>
                <text x="70" y="68" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" fontFamily="Arial">{score}</text>
                <text x="70" y="78" textAnchor="middle" fill={color} fontSize="10" fontFamily="Arial">/100</text>
              </svg>
              <div style={{ fontSize:13, fontWeight:800, color, marginTop:2 }}>{label}</div>
              {isPaid && <div style={{ fontSize:10, color:"#81c784", marginTop:3 }}>Potentiel : <span style={{ color:"#f9a825", fontWeight:700 }}>{potential}/100</span></div>}
            </div>

            {isPaid && hasDiag && diagScore !== null && (
              <div style={{ background:"rgba(33,150,243,0.12)", border:"1px solid rgba(66,165,245,0.3)", borderRadius:8, padding:"6px 8px", marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:16 }}>{diagEmoji}</span>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:"#90caf9" }}>📸 Diag pris en compte</div>
                  <div style={{ fontSize:9, color:"#81c784" }}>Valide encore {7-diagAge}j · <span style={{ color: diagInfluence >= 0 ? "#a5d6a7" : "#ef9a9a" }}>{diagInfluence >= 0 ? "+" : ""}{diagInfluence} pts</span></div>
                </div>
              </div>
            )}

            {isPaid && !hasDiag && (
              <div onClick={() => navigate("/diagnostic")} style={{ background:"rgba(33,150,243,0.08)", border:"1px dashed rgba(66,165,245,0.3)", borderRadius:8, padding:"6px 8px", marginTop:8, cursor:"pointer", textAlign:"center" }}>
                <div style={{ fontSize:10, color:"#90caf9" }}>📸 Diagnostic photo</div>
                <div style={{ fontSize:9, color:"#81c784" }}>Influence jusqu'à 30% du score</div>
              </div>
            )}

            {isPaid && issues.length > 0 && (
              <div style={{ marginTop:8 }}>
                <button onClick={() => setShowIssues(!showIssues)} style={{ background:"none", border:"none", color:"#f9a825", cursor:"pointer", fontSize:11, fontWeight:700, padding:0 }}>
                  ⚠️ {issues.length} problème{issues.length>1?"s":""} {showIssues?"▲":"▼"}
                </button>
                {showIssues && issues.map((issue,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"4px 6px", background:"rgba(239,108,0,0.1)", borderRadius:6, marginTop:3, fontSize:10 }}>
                    <span>{issue.icon} {issue.label}</span>
                    <span style={{ color:"#ef9a9a" }}>{issue.impact} pts</span>
                  </div>
                ))}
              </div>
            )}

            {!isPaid && (
              <div style={{ textAlign:"center", marginTop:8 }}>
                <div style={{ fontSize:10, color:"#81c784", marginBottom:6 }}>🔒 +{potential-score} pts possibles</div>
                <button onClick={() => navigate("/subscribe")} style={{ background:"linear-gradient(135deg,#F59E0B,#D97706)", color:"#1a1a1a", fontWeight:800, border:"none", borderRadius:8, cursor:"pointer", padding:"6px 14px", fontSize:11 }}>⭐ Premium</button>
              </div>
            )}
          </div>

          {/* Météo */}
          <div>
            {isPaid ? (
              <div style={{ ...card(), background:"linear-gradient(135deg,rgba(46,125,50,0.3),rgba(27,94,32,0.2))", border:"1px solid rgba(165,214,167,0.2)", padding:12, height:"100%", boxSizing:"border-box" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:10, color:"#81c784", fontWeight:700 }}>📍 {locationName || "Localisation"}</div>
                    <div style={{ fontSize:10, color:"#81c784", opacity:0.7 }}>{MONTHS_FR[month]} — {plan.label}</div>
                  </div>
                  <button onClick={refreshLocation} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, padding:"4px 8px", color:"#e8f5e9", fontSize:11, cursor:"pointer" }}>
                    {locLoading ? "⌛" : "🔄"}
                  </button>
                </div>
                {weather ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {[
                      { icon:getWMO(weather.code).icon, val:`${Math.round(weather.temp_max)}°C`, label:getWMO(weather.code).label },
                      { icon:"💨", val:`${weather.wind}km/h`, label:"Vent" },
                      { icon:"💧", val:`${weather.precip}mm`, label:"Pluie" },
                    ].map(({ icon, val, label }) => (
                      <div key={label} style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.06)", borderRadius:10, padding:"6px 10px" }}>
                        <span style={{ fontSize:18 }}>{icon}</span>
                        <div>
                          <div style={{ fontSize:15, fontWeight:800, lineHeight:1 }}>{val}</div>
                          <div style={{ fontSize:9, color:"#81c784" }}>{label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign:"center", color:"#81c784", fontSize:12, padding:"12px 0" }}>
                    {loading || locLoading ? "🌿 Détection..." : "🔄 Actualiser"}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ ...card(), textAlign:"center", padding:14, height:"100%", boxSizing:"border-box", display:"flex", flexDirection:"column", justifyContent:"center" }}>
                <div style={{ fontSize:12, color:"#81c784", marginBottom:8 }}>🔒 Météo temps réel</div>
                <button onClick={() => navigate("/subscribe")} style={{ background:"linear-gradient(135deg,#F59E0B,#D97706)", color:"#1a1a1a", fontWeight:800, border:"none", borderRadius:8, cursor:"pointer", padding:"6px 14px", fontSize:11 }}>Premium</button>
              </div>
            )}
          </div>
        </div>

        {/* ── ALERTES MÉTÉO ─────────────────────────────────────────────────── */}
        {isPaid && alerts.map((a, i) => <AlertBanner key={i} alert={a} />)}

        {/* ── STREAK ────────────────────────────────────────────────────────── */}
        {streak > 0 && (
          <div style={{ background: enDanger ? "rgba(230,81,0,0.15)" : modeHiver ? "rgba(21,101,192,0.12)" : "rgba(76,175,80,0.12)", border:`1px solid ${enDanger ? "rgba(239,108,0,0.4)" : modeHiver ? "rgba(66,165,245,0.3)" : "rgba(102,187,106,0.35)"}`, borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <span style={{ fontSize:22 }}>{modeHiver ? "🛡️" : enDanger ? "⚠️" : "🔥"}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14, color: enDanger ? "#ef9a9a" : modeHiver ? "#90caf9" : "#a5d6a7" }}>
                {modeHiver ? `Streak protégé — ${streak} jours` : `${streak} jour${streak > 1 ? "s" : ""} de streak`}
              </div>
              <div style={{ fontSize:11, color: enDanger ? "#f57c00" : modeHiver ? "#64b5f6" : "#66BB6A", marginTop:2 }}>
                {modeHiver ? "1 connexion/semaine suffit cet hiver" : enDanger ? "Connecte-toi aujourd'hui pour garder ton streak !" : "Continue comme ça !"}
              </div>
            </div>
          </div>
        )}

        {/* ── GREENPOINTS ───────────────────────────────────────────────────── */}
        <div style={{ ...card(), padding:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <span style={{ fontWeight:700, color:"#66BB6A", fontSize:14 }}>🌿 GreenPoints</span>
            <span style={{ background: palier?.couleur || "#2e7d32", color:"white", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:600 }}>
              {palier?.icone} {palier?.label}
            </span>
          </div>
          <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:8 }}>
            <span style={{ fontSize:30, fontWeight:800, color:"#a5d6a7" }}>{gpTotal.toLocaleString("fr-FR")}</span>
            <span style={{ color:"#81c784", fontSize:12 }}>pts</span>
          </div>
          {prochainPalier && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#81c784", marginBottom:3 }}>
                <span>{palier?.label}</span>
                <span>{prochainPalier.icone} {prochainPalier.label} — {prochainPalier.min.toLocaleString("fr-FR")} pts</span>
              </div>
              <div style={{ background:"rgba(255,255,255,0.1)", borderRadius:8, height:6, overflow:"hidden" }}>
                <div style={{ width:`${progressPalier}%`, height:"100%", background:"linear-gradient(90deg,#43a047,#a5d6a7)", borderRadius:8, transition:"width 0.8s" }}/>
              </div>
            </div>
          )}
        </div>

        {/* ── CLASSEMENT ────────────────────────────────────────────────────── */}
        <div style={{ ...card(), padding:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <span style={{ fontWeight:700, color:"#66BB6A", fontSize:14 }}>🏆 Classement</span>
            {classementActif ? (
              <span style={{ background: ligueActuelle?.couleurBg || "rgba(76,175,80,0.2)", color: ligueActuelle?.couleur || "#43a047", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:600, border:`1px solid ${ligueActuelle?.couleur || "#43a047"}44` }}>
                {ligueActuelle?.icone} Ligue {ligueActuelle?.label}
              </span>
            ) : <span style={{ fontSize:11, color:"#81c784" }}>😴 En pause</span>}
          </div>
          {classementActif ? (
            <>
              <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:8 }}>
                <span style={{ fontSize:30, fontWeight:800, color:"#a5d6a7" }}>{position}<span style={{ fontSize:14, color:"#81c784" }}>e</span></span>
                <span style={{ fontSize:12, color:"#81c784" }}>/ {totalJoueurs} joueurs · {pointsSemaine} pts cette semaine</span>
              </div>
              <div style={{ padding:"8px 10px", background: enZonePromotion ? "rgba(76,175,80,0.15)" : enZoneRetrogradation ? "rgba(230,81,0,0.15)" : "rgba(255,255,255,0.05)", borderRadius:10, color: enZonePromotion ? "#a5d6a7" : enZoneRetrogradation ? "#ef9a9a" : "#81c784", fontSize:12, fontWeight:500, marginBottom:10 }}>
                {messageClassement}{joursRestants <= 2 && <span style={{ fontWeight:700, color:"#f9a825" }}> — ⏰ Urgence !</span>}
              </div>
              <button onClick={() => navigate("/classement")} style={{ width:"100%", background:"rgba(76,175,80,0.2)", color:"#a5d6a7", border:"1px solid rgba(76,175,80,0.3)", borderRadius:10, padding:"9px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                Voir le classement complet →
              </button>
            </>
          ) : (
            <div style={{ textAlign:"center", padding:"8px 0" }}>
              <div style={{ fontSize:13, color:"#81c784", marginBottom:4 }}>😴 Classement en pause jusqu'en février</div>
              <div style={{ fontSize:11, color:"#4a7c5c" }}>Profite de l'hiver pour préparer ta saison !</div>
            </div>
          )}
        </div>

        {/* ── ÉVOLUTION DU SCORE ────────────────────────────────────────────── */}
        <div style={{ ...card(), padding:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ fontWeight:700, color:"#66BB6A", fontSize:14 }}>📈 Évolution du score</span>
            <div style={{ display:"flex", gap:4 }}>
              {["7j","30j"].map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{ background: period===p ? "rgba(76,175,80,0.3)" : "none", border:`1px solid ${period===p ? "#43a047" : "rgba(255,255,255,0.2)"}`, borderRadius:8, padding:"2px 8px", color: period===p ? "#a5d6a7" : "#81c784", fontSize:11, cursor:"pointer" }}>{p}</button>
              ))}
            </div>
          </div>

          {/* Mini graphe SVG */}
          <div style={{ position:"relative", height:60, marginBottom:8 }}>
            <svg width="100%" height="60" style={{ overflow:"visible" }}>
              {scoreHistory.length > 1 && (() => {
                const w = 100 / (scoreHistory.length - 1);
                const points = scoreHistory.map((p,i) => `${i*w}%,${60 - ((p.score - minScore) / scoreRange) * 50}`).join(" ");
                return (
                  <>
                    <polyline points={points} fill="none" stroke="#43a047" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
                    {scoreHistory.map((p,i) => (
                      <circle key={i} cx={`${i*w}%`} cy={60 - ((p.score - minScore) / scoreRange) * 50} r="3" fill="#66BB6A"/>
                    ))}
                    <text x="100%" y={60 - ((scoreHistory[scoreHistory.length-1].score - minScore) / scoreRange) * 50 - 6} textAnchor="end" fill="#a5d6a7" fontSize="11" fontWeight="bold">{scoreHistory[scoreHistory.length-1].score}</text>
                  </>
                );
              })()}
            </svg>
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#4a7c5c", marginBottom:12 }}>
            <span>Il y a {period === "30j" ? "30j" : "7j"}</span>
            <span>Aujourd'hui</span>
          </div>

          {/* Stats interventions */}
          <div style={{ display:"flex", gap:8 }}>
            {[
              { icon:"✂️", val:tontes, label:"Tontes" },
              { icon:"💧", val:arrosages, label:"Arrosages" },
              { icon:"🌱", val:engrais, label:"Engrais" },
            ].map(({ icon, val, label }) => (
              <div key={label} style={{ flex:1, background:"rgba(255,255,255,0.05)", borderRadius:10, padding:"8px 6px", textAlign:"center" }}>
                <div style={{ fontSize:18 }}>{icon}</div>
                <div style={{ fontSize:18, fontWeight:800, color:"#a5d6a7" }}>{val}</div>
                <div style={{ fontSize:10, color:"#81c784" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── LIENS LÉGAUX ──────────────────────────────────────────────────── */}
        <div style={{ display:"flex", justifyContent:"center", flexWrap:"wrap", gap:12, padding:"8px 0" }}>
          {[
            { label:"Mentions légales", route:"/mentions-legales" },
            { label:"Confidentialité",  route:"/confidentialite" },
            { label:"CGU",              route:"/cgu" },
            { label:"CGV",              route:"/cgv" },
          ].map(({ label, route }) => (
            <span key={route} onClick={() => navigate(route)} style={{ fontSize:10, color:"#4a7c5c", cursor:"pointer", textDecoration:"underline" }}>{label}</span>
          ))}
        </div>

        <div style={{ textAlign:"center", padding:"8px 0 24px" }}>
          <div style={{ fontSize:10, color:"#2d4a35", fontStyle:"italic" }}>🌿 Mon Gazon 360 — Tant qu'il y a gazon, il y a match</div>
        </div>

      </div>
    </div>
  );
}
