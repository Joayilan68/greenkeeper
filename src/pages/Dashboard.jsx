import { useNavigate } from "react-router-dom";
import { useUser, UserButton } from "@clerk/clerk-react";
import { useWeather } from "../lib/useWeather";
import { useProfile } from "../lib/useProfile";
import { useHistory } from "../lib/useHistory";
import { useSubscription } from "../lib/useSubscription";
import { MONTHLY_PLAN, MONTHS_FR, getWMO } from "../lib/lawn";
import { calcLawnScore } from "../lib/lawnScore";
import { generateNotifications } from "../lib/notifications";
import { usePushNotifications } from "../lib/usePushNotifications";
import AlertBanner from "../components/AlertBanner";
import OnboardingModal from "../components/OnboardingModal";
import { card, cardTitle, pill, btn, scroll, header } from "../lib/styles";
import { useState, useEffect } from "react";
// ── Nouveaux hooks ────────────────────────────────────────────────────────────
import { useGreenPoints } from "../lib/useGreenPoints";
import { useStreak } from "../lib/useStreak";
import { useClassement } from "../lib/useClassement";
import { useSaison } from "../lib/useSaison";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { weather, location, locationName, alerts = [], loading, locLoading, refreshLocation } = useWeather() || {};
  const { profile, saveProfile } = useProfile();
  const { history = [] } = useHistory();
  const { isPaid = false, isAdmin = false } = useSubscription() || {};
  const [showIssues, setShowIssues]           = useState(false);
  const [dismissedNotifs, setDismissedNotifs] = useState([]);
  const [pushActivated, setPushActivated]     = useState(false);
  const [showOnboarding, setShowOnboarding]   = useState(false);

  const { permission, subscribe, sendTestNotification, sendAlert, isSupported } = usePushNotifications(user?.id);

  // ── Nouveaux hooks ──────────────────────────────────────────────────────────
  const { classementActif } = useSaison();
  const { total: gpTotal, palier, prochainPalier, progressPalier } = useGreenPoints();
  const { actuel: streak, enDanger, modeHiver } = useStreak();
  const {
    ligueActuelle, position, totalJoueurs, pointsSemaine,
    enZonePromotion, enZoneRetrogradation, joursRestants, messageClassement
  } = useClassement();

  useEffect(() => {
    const done = localStorage.getItem("mg360_onboarding_done") || localStorage.getItem("gk_onboarding_done"); // rétrocompat
    if (!done && !profile) setTimeout(() => setShowOnboarding(true), 800);
  }, [profile]);

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

  const notifications = generateNotifications({ weather, profile, history, month, score, location })
    .filter(n => !dismissedNotifs.includes(n.id));

  const dangers  = notifications.filter(n => n.type === "danger").length;
  const warnings = notifications.filter(n => n.type === "warning").length;

  useEffect(() => {
    if (permission !== "granted") return;
    notifications
      .filter(n => n.type === "danger" || n.type === "warning")
      .forEach(n => sendAlert(n));
  }, [notifications.length, permission]);

  const handleActivatePush = async () => {
    const success = await subscribe();
    if (success) { setPushActivated(true); await sendTestNotification(); }
  };

  const handleOnboardingComplete = (newProfile) => {
    saveProfile(newProfile);
    setShowOnboarding(false);
  };

  const handleNotifAction = (actionRoute) => {
    if (actionRoute === "/onboarding-location") {
      setShowOnboarding(true);
    } else {
      navigate(actionRoute);
    }
  };

  const NOTIF_COLORS = {
    danger:  { bg:"rgba(183,28,28,0.2)",  border:"rgba(229,57,53,0.4)",  badge:"#c62828" },
    warning: { bg:"rgba(230,81,0,0.2)",   border:"rgba(239,108,0,0.4)",  badge:"#e65100" },
    info:    { bg:"rgba(21,101,192,0.15)", border:"rgba(66,165,245,0.3)", badge:"#1565c0" },
  };

  // ── Variables tuile profil ────────────────────────────────────────────────
  const profileCompletion   = profile?.profileCompletion || (profile ? 40 : 0);
  const OBJECTIF_LABELS_MAP = { parfait:"Gazon parfait", fonctionnel:"Pelouse fonctionnelle", naturel:"Gazon naturel", renover:"Rénover ma pelouse", creer:"Créer une nouvelle pelouse" };
  const SOL_LABELS_MAP      = { argileux:"Argileux", limoneux:"Limoneux", sableux:"Sableux", calcaire:"Calcaire", humifere:"Humifère", compacte:"Compacté", inconnu:"Non défini" };
  const EXPO_LABELS_MAP     = { ensoleille:"Ensoleillé", "mi-ombre":"Mi-ombre", ombrage:"Ombragé" };
  const ARROSAGE_LABELS_MAP = { automatique:"Arrosage auto", manuel:"Tuyau/manuel", aucun:"Pas d'arrosage", rarement:"Rarement" };
  const BUDGET_LABELS_MAP   = { "0-50":"0–50€/an", "50-150":"50–150€/an", "150-300":"150–300€/an", "300-600":"300–600€/an", "600+":"+600€/an", inconnu:"Non défini" };
  const profilePhase1 = !profile ? [] : [
    profile.objectif  ? { icon:"🎯", label:"Objectif", val: OBJECTIF_LABELS_MAP[profile.objectif] || profile.objectif } : null,
    gazonDisplay      ? { icon:"🌿", label:"Gazon",    val: gazonDisplay } : null,
    profile.surface   ? { icon:"📐", label:"Surface",  val: `${profile.surface} m²` } : null,
    profile.ville     ? { icon:"📍", label:"Ville",    val: profile.ville } : null,
  ].filter(Boolean);
  const profilePhase2 = !profile ? [] : [
    profile.sol && profile.sol !== "N/A" ? { icon:"🏔️", label:"Sol",        val: SOL_LABELS_MAP[profile.sol] || profile.sol } : null,
    profile.exposition ? { icon:"☀️",  label:"Exposition", val: EXPO_LABELS_MAP[profile.exposition] || profile.exposition } : null,
    profile.arrosage   ? { icon:"💧",  label:"Arrosage",   val: ARROSAGE_LABELS_MAP[profile.arrosage] || profile.arrosage } : null,
    profile.tondeuse?.length > 0 ? { icon:"✂️", label:"Tondeuse", val: `${profile.tondeuse.length} type${profile.tondeuse.length > 1 ? "s" : ""}` } : null,
    profile.budget     ? { icon:"💰",  label:"Budget",     val: BUDGET_LABELS_MAP[profile.budget] || profile.budget } : null,
  ].filter(Boolean);
  const profileManquants = !profile ? [] : [
    !profile.sol || profile.sol === "N/A" ? "Type de sol" : null,
    !profile.exposition ? "Exposition" : null,
    !profile.arrosage   ? "Arrosage"   : null,
    !profile.tondeuse?.length ? "Tondeuse" : null,
    !profile.budget     ? "Budget"     : null,
  ].filter(Boolean);

  return (
    <div>
      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ ...header, display:"flex", flexDirection:"column", alignItems:"center" }}>
        <div style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", paddingRight:4, marginBottom:8 }}>
          <div style={{ fontSize:11, color:"#81c784" }}>
            {today.toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" })}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {isAdmin && (
              <button onClick={() => navigate("/pilotage")} style={{ background:"rgba(249,168,37,0.2)", border:"1px solid rgba(249,168,37,0.3)", borderRadius:8, padding:"4px 10px", color:"#f9a825", fontSize:11, cursor:"pointer" }}>
                📊
              </button>
            )}
            <button onClick={() => navigate("/parametres")} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, padding:"4px 10px", color:"#81c784", fontSize:11, cursor:"pointer" }}>
              ⚙️
            </button>
            <UserButton appearance={{ variables: { colorPrimary:"#43a047" } }} />
          </div>
        </div>
        <div style={{ textAlign:"center", marginBottom:4 }}>
          <img
            src="/mg360-mascot-transparent.png"
            alt="Mongazon360"
            style={{ width:72, height:72, objectFit:"contain", display:"block", margin:"0 auto 2px" }}
          />
          <div style={{ fontSize:9, color:"#4a7c5c", fontStyle:"italic", letterSpacing:0.5 }}>
            Tant qu'il y a gazon, il y a match
          </div>
        </div>
        <div style={{ fontSize:22, fontWeight:800, color:"#a5d6a7", marginTop:6 }}>
          Bonjour {user?.firstName || ""} 👋
        </div>
        {isAdmin && <div style={{ fontSize:11, color:"#f9a825", marginTop:2 }}>👑 Mode Admin</div>}
      </div>

      <div style={scroll}>

        {/* ── BANNIÈRE VILLE NON VÉRIFIÉE ───────────────────────────────────── */}
        {profile?.cityNotFound && (
          <div style={{
            background: "rgba(230,81,0,0.15)", border: "1px solid rgba(239,108,0,0.4)",
            borderRadius: 14, padding: "12px 14px", marginBottom: 4,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 22 }}>📍</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f9a825", marginBottom: 2 }}>
                Ville introuvable — météo désactivée
              </div>
              <div style={{ fontSize: 12, color: "#81c784", lineHeight: 1.5 }}>
                "{profile.ville}" n'a pas pu être localisée. Corrigez votre ville pour activer la météo et les conseils saisonniers.
              </div>
            </div>
            <button
              onClick={() => setShowOnboarding(true)}
              style={{ background: "rgba(239,108,0,0.3)", border: "1px solid rgba(239,108,0,0.5)", borderRadius: 10, padding: "6px 12px", color: "#f9a825", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              Corriger →
            </button>
          </div>
        )}
        <div style={{ ...card(), background:"linear-gradient(135deg, rgba(27,94,32,0.4), rgba(13,43,26,0.6))", border:`1px solid ${color}44` }}>
          <div style={{ fontSize:11, color:"#81c784", fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", marginBottom:12, textAlign:"center" }}>
            🌿 Score Santé du Gazon
          </div>
          <div style={{ textAlign:"center", marginBottom:12 }}>
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

          {isPaid && hasDiag && diagScore !== null && (
            <div style={{ background:"rgba(33,150,243,0.12)", border:"1px solid rgba(66,165,245,0.3)", borderRadius:10, padding:"8px 12px", marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:20 }}>{diagEmoji}</span>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:"#90caf9" }}>📸 Diagnostic photo pris en compte</div>
                  <div style={{ fontSize:10, color:"#81c784" }}>
                    Score visuel : {diagScore}/100 · Il y a {diagAge}j
                    {diagAge < 7 && <span style={{ color:"#f9a825" }}> · Valide encore {7 - diagAge}j</span>}
                  </div>
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:12, fontWeight:700, color: diagInfluence >= 0 ? "#a5d6a7" : "#ef9a9a" }}>
                  {diagInfluence >= 0 ? "+" : ""}{diagInfluence} pts
                </div>
                <div style={{ fontSize:10, color:"#81c784" }}>influence</div>
              </div>
            </div>
          )}

          {isPaid && !hasDiag && (
            <div onClick={() => navigate("/diagnostic")} style={{ background:"rgba(33,150,243,0.08)", border:"1px dashed rgba(66,165,245,0.3)", borderRadius:10, padding:"8px 12px", marginBottom:10, cursor:"pointer", textAlign:"center" }}>
              <div style={{ fontSize:11, color:"#90caf9" }}>📸 Faire un diagnostic photo pour affiner le score</div>
              <div style={{ fontSize:10, color:"#81c784", marginTop:2 }}>Influence jusqu'à 30% du score · Valide 7 jours</div>
            </div>
          )}

          {strengths.length > 0 && (
            <div style={{ marginBottom:8 }}>
              {strengths.map((s,i) => (
                <div key={i} style={{ fontSize:12, color:"#a5d6a7", padding:"3px 0" }}>{s.icon} {s.label}</div>
              ))}
            </div>
          )}

          {isPaid && issues.length > 0 && (
            <div>
              <button onClick={() => setShowIssues(!showIssues)} style={{ background:"none", border:"none", color:"#f9a825", cursor:"pointer", fontSize:12, fontWeight:700, padding:0 }}>
                ⚠️ {issues.length} problème{issues.length>1?"s":""} détecté{issues.length>1?"s":""} {showIssues?"▲":"▼"}
              </button>
              {showIssues && issues.map((issue,i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 8px", background:"rgba(239,108,0,0.1)", borderRadius:8, marginBottom:4, fontSize:12, marginTop:4 }}>
                  <span>{issue.icon} {issue.label}</span>
                  <span style={{ color:"#ef9a9a" }}>{issue.impact} pts</span>
                </div>
              ))}
            </div>
          )}

          {!isPaid && (
            <div style={{ textAlign:"center", marginTop:8 }}>
              <div style={{ fontSize:12, color:"#81c784", marginBottom:8 }}>
                🔒 Diagnostic complet — <span style={{ color:"#f9a825", fontWeight:700 }}>+{potential-score} pts possibles</span>
              </div>
              <button onClick={() => navigate("/subscribe")} style={{ ...btn.primary, width:"auto", padding:"8px 20px", fontSize:12 }}>
                ⭐ Améliorer mon gazon
              </button>
            </div>
          )}
        </div>

        {/* ── WIDGET GREENPOINTS + STREAK ───────────────────────────────────── */}
        <div style={{ ...card(), padding:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <span style={{ fontWeight:700, color:"#a5d6a7", fontSize:14 }}>🌿 GreenPoints</span>
            <span style={{
              background:  palier?.couleur || "#2e7d32",
              color:       "white",
              borderRadius: 20,
              padding:     "2px 10px",
              fontSize:    11,
              fontWeight:  600,
            }}>
              {palier?.icone} {palier?.label}
            </span>
          </div>

          <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:8 }}>
            <span style={{ fontSize:30, fontWeight:800, color:"#a5d6a7" }}>
              {gpTotal.toLocaleString("fr-FR")}
            </span>
            <span style={{ color:"#81c784", fontSize:12 }}>pts</span>
          </div>

          {prochainPalier && (
            <div style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#81c784", marginBottom:3 }}>
                <span>{palier?.label}</span>
                <span>{prochainPalier.icone} {prochainPalier.label} — {prochainPalier.min.toLocaleString("fr-FR")} pts</span>
              </div>
              <div style={{ background:"rgba(255,255,255,0.1)", borderRadius:8, height:6, overflow:"hidden" }}>
                <div style={{
                  width:      `${progressPalier}%`,
                  height:     "100%",
                  background: "linear-gradient(90deg, #43a047, #a5d6a7)",
                  borderRadius: 8,
                  transition: "width 0.8s ease",
                }}/>
              </div>
            </div>
          )}

          <div style={{
            display:      "flex",
            alignItems:   "center",
            gap:          8,
            padding:      "8px 10px",
            background:   enDanger ? "rgba(230,81,0,0.15)" : modeHiver ? "rgba(21,101,192,0.15)" : "rgba(76,175,80,0.15)",
            borderRadius: 10,
            border:       `1px solid ${enDanger ? "rgba(239,108,0,0.3)" : modeHiver ? "rgba(66,165,245,0.3)" : "rgba(76,175,80,0.2)"}`,
          }}>
            <span style={{ fontSize:20 }}>
              {modeHiver ? "🛡️" : enDanger ? "⚠️" : "🔥"}
            </span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:13, color: enDanger ? "#ef9a9a" : modeHiver ? "#90caf9" : "#a5d6a7" }}>
                {modeHiver ? `Streak protégé — ${streak} jours` : `${streak} jour${streak > 1 ? "s" : ""} de streak`}
              </div>
              <div style={{ fontSize:10, color:"#81c784" }}>
                {modeHiver ? "1 connexion/semaine suffit cet hiver" : enDanger ? "Connecte-toi aujourd'hui !" : "Continue comme ça !"}
              </div>
            </div>
          </div>
        </div>

        {/* ── WIDGET CLASSEMENT ─────────────────────────────────────────────── */}
        <div style={{ ...card(), padding:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <span style={{ fontWeight:700, color:"#a5d6a7", fontSize:14 }}>🏆 Classement</span>
            {classementActif ? (
              <span style={{
                background:  ligueActuelle?.couleurBg || "rgba(76,175,80,0.2)",
                color:       ligueActuelle?.couleur || "#43a047",
                borderRadius: 20,
                padding:     "2px 10px",
                fontSize:    11,
                fontWeight:  600,
                border:      `1px solid ${ligueActuelle?.couleur || "#43a047"}44`,
              }}>
                {ligueActuelle?.icone} Ligue {ligueActuelle?.label}
              </span>
            ) : (
              <span style={{ fontSize:11, color:"#81c784" }}>😴 En pause</span>
            )}
          </div>

          {classementActif ? (
            <>
              <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:8 }}>
                <span style={{ fontSize:30, fontWeight:800, color:"#a5d6a7" }}>
                  {position}<span style={{ fontSize:14, color:"#81c784" }}>e</span>
                </span>
                <span style={{ fontSize:12, color:"#81c784" }}>
                  / {totalJoueurs} joueurs · {pointsSemaine} pts cette semaine
                </span>
              </div>
              <div style={{
                padding:      "8px 10px",
                background:   enZonePromotion ? "rgba(76,175,80,0.15)" : enZoneRetrogradation ? "rgba(230,81,0,0.15)" : "rgba(255,255,255,0.05)",
                borderRadius: 10,
                color:        enZonePromotion ? "#a5d6a7" : enZoneRetrogradation ? "#ef9a9a" : "#81c784",
                fontSize:     12,
                fontWeight:   500,
                marginBottom: 10,
              }}>
                {messageClassement}
                {joursRestants <= 2 && <span style={{ fontWeight:700, color:"#f9a825" }}> — ⏰ Urgence !</span>}
              </div>
              <button
                onClick={() => navigate("/classement")}
                style={{ width:"100%", background:"rgba(76,175,80,0.2)", color:"#a5d6a7", border:"1px solid rgba(76,175,80,0.3)", borderRadius:10, padding:"9px", fontSize:12, fontWeight:600, cursor:"pointer" }}
              >
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

        {/* ── NOTIFICATIONS INTELLIGENTES ───────────────────────────────────── */}
        {notifications.length > 0 && (
          <div style={{ marginBottom:4 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, padding:"0 2px" }}>
              <span style={{ fontSize:13, fontWeight:700 }}>🔔 Alertes</span>
              {dangers > 0 && <span style={{ background:"#c62828", color:"#fff", borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{dangers} urgent{dangers>1?"s":""}</span>}
              {warnings > 0 && <span style={{ background:"#e65100", color:"#fff", borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{warnings} warning{warnings>1?"s":""}</span>}
            </div>
            {(isPaid ? notifications : notifications.slice(0,1)).map(n => {
              const c = NOTIF_COLORS[n.type] || NOTIF_COLORS.info;
              return (
                <div key={n.id} style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:14, padding:"12px 14px", marginBottom:8, position:"relative" }}>
                  <button onClick={() => setDismissedNotifs(p => [...p, n.id])} style={{ position:"absolute", top:8, right:10, background:"none", border:"none", color:"rgba(255,255,255,0.4)", cursor:"pointer", fontSize:16 }}>×</button>
                  <div style={{ display:"flex", gap:10, alignItems:"flex-start", paddingRight:20 }}>
                    <span style={{ fontSize:22, minWidth:28 }}>{n.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>
                        {n.title}
                        {n.impact < 0 && <span style={{ marginLeft:8, fontSize:11, color:"#ef9a9a", fontWeight:600 }}>{n.impact} pts</span>}
                        {n.impact > 0 && <span style={{ marginLeft:8, fontSize:11, color:"#a5d6a7", fontWeight:600 }}>+{n.impact} pts</span>}
                      </div>
                      <div style={{ fontSize:12, color:"#81c784", lineHeight:1.5, marginBottom:8 }}>{n.message}</div>
                      {n.action && (
                        <button onClick={() => handleNotifAction(n.actionRoute)} style={{ background:c.badge, border:"none", borderRadius:8, padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                          {n.action} →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {!isPaid && notifications.length > 1 && (
              <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:"10px 14px", textAlign:"center", fontSize:12, color:"#81c784" }}>
                🔒 {notifications.length - 1} alerte{notifications.length-1>1?"s":""} supplémentaire{notifications.length-1>1?"s":""} —
                <span style={{ color:"#a5d6a7", cursor:"pointer", textDecoration:"underline", marginLeft:4 }} onClick={() => navigate("/subscribe")}>Passer Premium</span>
              </div>
            )}
          </div>
        )}

        {/* ── PUSH NOTIFICATIONS ────────────────────────────────────────────── */}
        {isSupported && isPaid && permission !== "granted" && (
          <div style={{ ...card(), background:"rgba(76,175,80,0.1)", border:"1px solid rgba(76,175,80,0.3)", textAlign:"center", padding:16 }}>
            <div style={{ fontSize:22, marginBottom:8 }}>🔔</div>
            <div style={{ fontSize:13, fontWeight:700, color:"#a5d6a7", marginBottom:6 }}>Activez les alertes sur votre téléphone</div>
            <div style={{ fontSize:12, color:"#81c784", marginBottom:12, lineHeight:1.5 }}>
              Recevez des alertes même quand l'app est fermée — canicule, gel, tonte en retard...
            </div>
            <button onClick={handleActivatePush} style={{ ...btn.primary, width:"auto", padding:"10px 24px" }}>
              🔔 Activer les notifications
            </button>
          </div>
        )}

        {isSupported && isPaid && permission === "granted" && !pushActivated && (
          <div style={{ ...card(), background:"rgba(76,175,80,0.08)", border:"1px solid rgba(76,175,80,0.2)", textAlign:"center", padding:12 }}>
            <div style={{ fontSize:12, color:"#a5d6a7" }}>✅ Notifications activées — Alertes max 1x/semaine</div>
          </div>
        )}

        {/* ── ALERTES MÉTÉO ─────────────────────────────────────────────────── */}
        {isPaid && alerts.map((a, i) => <AlertBanner key={i} alert={a} />)}

        {/* ── MÉTÉO ─────────────────────────────────────────────────────────── */}
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

        {/* ── PROFIL ────────────────────────────────────────────────────────── */}
        {(()=>{
          const completion = profileCompletion;
          const phase1     = profilePhase1;
          const phase2     = profilePhase2;
          const manquants  = profileManquants;
          return (
            <div style={card()}>
              <div style={cardTitle}>
                <span>👤 Mon profil</span>
                <button onClick={() => navigate("/setup")} style={{ background:"rgba(76,175,80,0.2)", border:"none", borderRadius:8, padding:"4px 10px", color:"#a5d6a7", fontSize:11, cursor:"pointer" }}>
                  ✏️ Modifier
                </button>
              </div>

              {profile ? (
                <>
                  {/* Barre de complétude */}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:5 }}>
                      <span style={{ color:"#81c784", fontWeight:700 }}>Complétude du profil</span>
                      <span style={{ color: completion >= 90 ? "#a5d6a7" : "#f4a261", fontWeight:800 }}>{completion}%</span>
                    </div>
                    <div style={{ height:7, background:"rgba(255,255,255,0.08)", borderRadius:6, overflow:"hidden" }}>
                      <div style={{ width:`${completion}%`, height:"100%", borderRadius:6, background:`linear-gradient(90deg,#2d6a4f,#52b788)`, transition:"width 0.6s" }} />
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"#4a7c5c", marginTop:3 }}>
                      <span>Onboarding ✅</span><span>Profil 90%</span><span>📸 Premium 100%</span>
                    </div>
                  </div>

                  {/* Infos Phase 1 */}
                  {phase1.length > 0 && (
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:"#4a7c5c", letterSpacing:1, marginBottom:6 }}>PROFIL DE BASE</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                        {phase1.map(({ icon, label, val }) => (
                          <span key={label} style={{ background:"rgba(82,183,136,0.1)", border:"1px solid rgba(82,183,136,0.2)", borderRadius:20, padding:"4px 10px", fontSize:11, color:"#95d5b2" }}>
                            {icon} {val}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Infos Phase 2 — Premium : tout affiché, Free : CTA */}
                  {phase2.length > 0 && (
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:"#4a7c5c", letterSpacing:1, marginBottom:6 }}>PROFIL DÉTAILLÉ</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                        {phase2.map(({ icon, label, val }) => (
                          <span key={label} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(149,213,178,0.18)", borderRadius:20, padding:"4px 10px", fontSize:11, color:"#e8f5e9" }}>
                            {icon} {val}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Champs manquants */}
                  {manquants.length > 0 && (
                    isPaid ? (
                      <div style={{ background:"rgba(244,162,97,0.08)", border:"1px solid rgba(244,162,97,0.25)", borderRadius:10, padding:"10px 12px", marginBottom:8 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"#f4a261", marginBottom:6 }}>
                          📋 À compléter ({manquants.length} champ{manquants.length > 1 ? "s" : ""})
                        </div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                          {manquants.map(m => (
                            <span key={m} style={{ fontSize:10, color:"#f4a261", background:"rgba(244,162,97,0.1)", borderRadius:20, padding:"2px 8px" }}>
                              {m}
                            </span>
                          ))}
                        </div>
                        <button onClick={() => navigate("/setup")} style={{ marginTop:10, width:"100%", background:"rgba(244,162,97,0.2)", color:"#f4a261", border:"1px solid rgba(244,162,97,0.3)", borderRadius:10, padding:"8px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                          Compléter → +{manquants.length * 8}% complétude
                        </button>
                      </div>
                    ) : (
                      <div style={{ background:"rgba(249,168,37,0.08)", border:"1px solid rgba(249,168,37,0.25)", borderRadius:10, padding:"10px 12px" }}>
                        <div style={{ fontSize:11, color:"#f9a825", marginBottom:6 }}>
                          🔒 {manquants.length} information{manquants.length > 1 ? "s" : ""} supplémentaire{manquants.length > 1 ? "s" : ""} disponible{manquants.length > 1 ? "s" : ""}
                        </div>
                        <div style={{ fontSize:11, color:"#81c784", marginBottom:8 }}>
                          Complétez votre profil pour des conseils plus précis et un meilleur score au classement.
                        </div>
                        <button onClick={() => navigate("/setup")} style={{ width:"100%", background:"rgba(249,168,37,0.15)", color:"#f9a825", border:"1px solid rgba(249,168,37,0.3)", borderRadius:10, padding:"8px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                          Compléter mon profil →
                        </button>
                      </div>
                    )
                  )}

                  {/* Profil complet */}
                  {manquants.length === 0 && completion < 100 && (
                    <div style={{ fontSize:11, color:"#52b788", textAlign:"center", padding:"6px 0" }}>
                      ✅ Profil complété à {completion}% — {isPaid ? "Faites un diagnostic photo pour atteindre 100%" : "Passez Premium pour le diagnostic photo"}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign:"center", padding:"10px 0" }}>
                  <div style={{ fontSize:13, color:"#81c784", marginBottom:6 }}>Configurez votre profil pour un score précis</div>
                  <button onClick={() => setShowOnboarding(true)} style={{ ...btn.primary, width:"auto", padding:"8px 24px" }}>
                    🚀 Configurer mon gazon
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── LIENS LÉGAUX ──────────────────────────────────────────────────── */}
        <div style={{ display:"flex", justifyContent:"center", flexWrap:"wrap", gap:12, padding:"8px 0 8px" }}>
          {[
            { label:"Mentions légales", route:"/mentions-legales" },
            { label:"Confidentialité",  route:"/confidentialite" },
            { label:"CGU",              route:"/cgu" },
            { label:"CGV",              route:"/cgv" },
          ].map(({ label, route }) => (
            <span key={route} onClick={() => navigate(route)} style={{ fontSize:10, color:"#4a7c5c", cursor:"pointer", textDecoration:"underline" }}>
              {label}
            </span>
          ))}
        </div>

        <div style={{ textAlign:"center", padding:"8px 0 24px" }}>
          <div style={{ fontSize:10, color:"#2d4a35", fontStyle:"italic" }}>
            🌿 Mon Gazon 360 — Tant qu'il y a gazon, il y a match
          </div>
        </div>

      </div>
    </div>
  );
}
