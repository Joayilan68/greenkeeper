import { useNavigate } from "react-router-dom";
import { useUser, UserButton } from "@clerk/clerk-react";
import { useWeather } from "../lib/useWeather";
import { useProfile } from "../lib/useProfile";
import { useParcours, phaseParcours } from "../lib/useParcours";
import { useHistory } from "../lib/useHistory";
import { useSubscription } from "../lib/useSubscription";
import { MONTHLY_PLAN, MONTHS_FR, getWMO } from "../lib/lawn";
import { calcLawnScore } from "../lib/lawnScore";
import { usePushNotifications } from "../lib/usePushNotifications";
import { isIOS, isStandalone, isAndroidTWA } from "../lib/platform";
import { OFFRE, offreEnCours } from "../lib/offreSaison";
import { useConsents } from "../lib/useConsents";
import { useReminders } from "../lib/useReminders";
import AlertBanner from "../components/AlertBanner";
import OnboardingModal from "../components/OnboardingModal";
import GreenScoreModal from "../components/GreenScoreModal";
import CompteARebours from "../components/CompteARebours";
import AvecPremium from "../components/AvecPremium";
import CarteNouveautes from "../components/CarteNouveautes";
import { anneeDuBilan, bilanDisponible } from "../lib/bilanSaison";
import { actionsDuJour } from "../lib/actionsDuJour";
import { card, cardTitle, btn, scroll } from "../lib/styles";
import { useState, useEffect } from "react";
import { useGreenPoints } from "../lib/useGreenPoints";
import { useStreak } from "../lib/useStreak";
import { useDiagnostics } from "../lib/useDiagnostics";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { weather, station, location, locationName, alerts = [], loading, locLoading, refreshLocation } = useWeather() || {};
  const { profile, saveProfile, synced } = useProfile();
  const { history = [] } = useHistory();
  const { isPaid = false, isAdmin = false, isTrial = false, isLoading: subLoading = true } = useSubscription() || {};
  const [showIssues, setShowIssues]   = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showScoreInfo, setShowScoreInfo] = useState(false);

  const { subscribe, sendTestNotification, isSupported, error: pushError, loading: pushLoading } = usePushNotifications(user?.id);
  const { consents, updateConsents, showPushBanner, syncFromReminders } = useConsents();
  const { enableAll } = useReminders(syncFromReminders);

  // ── Série et GreenPoints (résumé ; détail et classement dans Mon gazon → Mes progrès) ──────────────
  const { total: gpTotal, palier, gagnerPoints } = useGreenPoints();
  const { actuel: streak, enDanger, modeHiver, enregistrerConnexion } = useStreak();
  // Connexion du jour (série et GreenPoints) : comptée dès l'accueil, une fois par jour au plus, comme dans Aujourd'hui
  useEffect(() => {
    enregistrerConnexion();
    gagnerPoints("connexion_quotidienne");
  }, []); // eslint-disable-line

  // ── Diagnostics photo (source de vérité : Supabase) ────────────────────────
  // Garantit que le score santé est identique entre PC et mobile.
  const { diagnostics } = useDiagnostics();

  useEffect(() => {
    if (!synced) return;
    // ✅ Source de vérité : profile.onboarding_done (Supabase, multi-device)
    // Migration douce : si profile.onboarding_done est undefined mais localStorage
    // ou profile existe, on backfill dans profile une fois.
    const done = profile?.onboarding_done === true;
    const legacyDone = localStorage.getItem("mg360_onboarding_done") || localStorage.getItem("gk_onboarding_done");

    if (!done && !profile) {
      setTimeout(() => setShowOnboarding(true), 800);
    } else if (profile && !done && legacyDone) {
      // Migration : profile existe + ancien localStorage flag → on backfill
      saveProfile({ ...profile, onboarding_done: true });
      localStorage.removeItem("mg360_onboarding_done");
      localStorage.removeItem("gk_onboarding_done");
    } else if (profile && !done && !legacyDone && profile.pelouse) {
      // Profil rempli (avec pelouse) mais flag absent → on considère done
      saveProfile({ ...profile, onboarding_done: true });
    }
  }, [profile, synced]);

  const GAZON_LABELS = {
    sport: "Sport / résistant", ombre: "Ombre / mi-ombre", sec: "Sec / méditerranéen",
    ornemental: "Ornemental", universel: "Universel / mélange", chaud: "Gazon chaud",
    synthetique: "Gazon synthétique", inconnu: "Non défini",
    "ray-grass": "Ray-grass", fetuque: "Fétuque", kikuyu: "Kikuyu",
    bermuda: "Bermuda", paturin: "Pâturin", zoysia: "Zoysia", mixte: "Mélange",
  };

  const gazonDisplay = profile?.pelouse ? (GAZON_LABELS[profile.pelouse] || profile.pelouse) : null;

  const today = new Date();
  const month = today.getMonth() + 1;
  const plan  = MONTHLY_PLAN[month];

  const { score, potential, label, color, issues, strengths, diagScore, diagEmoji, diagAge, diagInfluence, hasDiag }
    = calcLawnScore({ weather, profile, history, month, diagnostics });

  // Résumé d'Aujourd'hui : mêmes actions que l'onglet Aujourd'hui (src/lib/actionsDuJour.js)
  const { parcours } = useParcours();
  const { recommended, prevoyez } = actionsDuJour({ profile, weather, history, diagnostics, parcours, phaseP: phaseParcours(parcours), month });
  const prochaine = prevoyez.find(a => a.status === "too_soon");

  const offre = offreEnCours();

  // iPhone dans Safari : sans installation, pas de notifications possibles → guide d'installation
  const [showIosInstall, setShowIosInstall] = useState(() => {
    try { return isIOS() && !isStandalone() && !localStorage.getItem("mg360_ios_install_hidden"); }
    catch { return false; }
  });
  const hideIosInstall = () => {
    setShowIosInstall(false);
    try { localStorage.setItem("mg360_ios_install_hidden", "1"); } catch { /* navigation privée */ }
  };

  const handleActivatePush = async () => {
    const success = await subscribe();
    if (success) {
      await sendTestNotification();
      await updateConsents({ notifications: true });
      enableAll(); // ✅ aligné sur Settings (21/07/2026) : sans rappels enabled, le cron n'envoie rien
    }
  };

  const handleOnboardingComplete = (newProfile) => {
    saveProfile(newProfile);
    setShowOnboarding(false);
  };


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
        {/* ✅ Branding Mongazon360® — visible discret sous le bonjour */}
        <div style={{ fontSize:11, color:"#81c784", fontStyle:"italic", opacity:0.8 }}>
          🌿 Prêt à prendre soin de ton gazon avec Mongazon360<sup style={{ fontSize:7 }}>®</sup> aujourd'hui ?
        </div>
        {isAdmin && <div style={{ fontSize:11, color:"#f9a825", marginTop:4, textAlign:"center" }}>👑 Mode Admin</div>}
      </div>

      <div style={scroll}>

        {/* ── NOUVEAUTÉS DE LA REFONTE (comptes créés avant la nouvelle version) ── */}
        <CarteNouveautes isPaid={isPaid} />

        {/* ── NOTIF PUSH ────────────────────────────────────────────────────── */}
        {isSupported && showPushBanner && (
          <div data-tuile="accueil-notifications" style={{ background:"linear-gradient(135deg,rgba(27,94,32,0.6),rgba(13,43,26,0.8))", border:"1px solid rgba(102,187,106,0.35)", borderRadius:14, padding:"14px 16px", marginBottom:4, display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:24, flexShrink:0 }}>🔔</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#F1F8F2", marginBottom:3 }}>Activez les alertes</div>
              <div style={{ fontSize:12, color:"#81c784", lineHeight:1.5 }}>
                Recevez les conseils de Bob même app fermée.
              </div>
              {pushError && <div style={{ fontSize:11, color:"#ffcc80", lineHeight:1.5, marginTop:6 }}>⚠️ {pushError}</div>}
            </div>
            <div
              role="button"
              onClick={() => { if (!pushLoading) handleActivatePush(); }}
              style={{ flexShrink:0, padding:"8px 14px", borderRadius:10, background:"linear-gradient(135deg,#43a047,#2e7d32)", color:"#fff", fontWeight:800, fontSize:12, cursor:"pointer", userSelect:"none", WebkitTapHighlightColor:"transparent" }}
            >
              {pushLoading ? "…" : "Activer"}
            </div>
          </div>
        )}

        {/* ── OFFRE SAISONNIÈRE (comptes gratuits ou en essai, hors app Android : pas d'achat dans le TWA) ── */}
        {offre && !subLoading && (!isPaid || isTrial) && !isAndroidTWA() && (
          <div data-tuile="accueil-offre-saisonniere" role="button" onClick={() => navigate("/subscribe")} style={{ background:"linear-gradient(135deg,rgba(249,168,37,0.25),rgba(13,43,26,0.8))", border:"1px solid rgba(249,168,37,0.45)", borderRadius:14, padding:"14px 16px", marginBottom:4, display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
            <span style={{ fontSize:24, flexShrink:0 }}>{offre.nom === "hiver" ? "❄️" : "☀️"}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#ffe082", marginBottom:3 }}>Offre {offre.nom === "hiver" ? "d'hiver" : "d'été"} : Premium 1 an à {String(OFFRE.prixOffre).replace(".", ",")} €</div>
              <div style={{ fontSize:12, color:"#81c784", lineHeight:1.5 }}>Au lieu de {String(OFFRE.prixAnnuel).replace(".", ",")} € — jusqu'au {offre.finLabel}. Prépare ta saison avec Bob.</div>
            </div>
            <span style={{ color:"#ffe082", fontSize:18, flexShrink:0 }}>›</span>
          </div>
        )}

        {/* ── IPHONE : installer l'app (condition des notifications sur iOS) ── */}
        {showIosInstall && (
          <div data-tuile="accueil-installer-iphone" style={{ background:"linear-gradient(135deg,rgba(27,94,32,0.6),rgba(13,43,26,0.8))", border:"1px solid rgba(102,187,106,0.35)", borderRadius:14, padding:"14px 16px", marginBottom:4, display:"flex", alignItems:"flex-start", gap:12 }}>
            <span style={{ fontSize:24, flexShrink:0 }}>📲</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#F1F8F2", marginBottom:3 }}>Installe Mongazon360 sur ton iPhone</div>
              <div style={{ fontSize:12, color:"#81c784", lineHeight:1.5 }}>
                Touche <b>Partager ⬆️</b> puis <b>« Sur l'écran d'accueil »</b>. Ouvre ensuite l'app depuis son icône : tu pourras recevoir les conseils de Bob en notification.
              </div>
            </div>
            <button onClick={hideIosInstall} aria-label="Masquer" style={{ background:"none", border:"none", color:"#81c784", fontSize:16, cursor:"pointer", padding:0, flexShrink:0 }}>✕</button>
          </div>
        )}

        {/* ── BANNIÈRE VILLE NON VÉRIFIÉE ────────────────────────────────── */}
        {profile?.cityNotFound && (
          <div data-tuile="accueil-ville-introuvable" style={{ background:"rgba(230,81,0,0.15)", border:"1px solid rgba(239,108,0,0.4)", borderRadius:14, padding:"12px 14px", marginBottom:4, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:22 }}>📍</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#f9a825", marginBottom:2 }}>Ville introuvable — météo désactivée</div>
              <div style={{ fontSize:12, color:"#81c784", lineHeight:1.5 }}>"{profile.ville}" n'a pas pu être localisée. Corrigez votre ville.</div>
            </div>
            <button onClick={() => setShowOnboarding(true)} style={{ background:"rgba(239,108,0,0.3)", border:"1px solid rgba(239,108,0,0.5)", borderRadius:10, padding:"6px 12px", color:"#f9a825", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>Corriger →</button>
          </div>
        )}

        {/* ── PARCOURS (Semis / Regarnissage en cours) ──────────────────── */}
        <CarteParcours parcours={parcours} />

        {/* ── COMPTE À REBOURS DU PRINTEMPS (1er novembre → 1re tonte) ──────── */}
        <CompteARebours profile={profile} soilTemp={weather?.soil_temp} isPaid={isPaid} />

        {/* ── LIGNE 1 : SCORE + MÉTÉO ────────────────────────────────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:4, alignItems:"stretch" }}>

          {/* Score */}
          <div data-tuile="accueil-score" style={{ ...card(), background:"linear-gradient(135deg,rgba(27,94,32,0.4),rgba(13,43,26,0.6))", border:`1px solid ${color}44`, padding:14, display:"flex", flexDirection:"column" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <div style={{ fontSize:10, color:"#66BB6A", fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>🌿 Score Santé</div>
              <button
                onClick={() => setShowScoreInfo(true)}
                style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(165,214,167,0.2)", borderRadius:"50%", width:22, height:22, color:"#a5d6a7", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}
                title="Comment fonctionne le GreenScore ?"
              >
                ℹ️
              </button>
            </div>
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
          {isPaid ? (
            <div data-tuile="accueil-meteo" style={{ ...card(), background:"linear-gradient(135deg,rgba(46,125,50,0.3),rgba(27,94,32,0.2))", border:"1px solid rgba(165,214,167,0.2)", padding:12, display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:10, color:"#81c784", fontWeight:700 }}>📍 {locationName || "Localisation"}</div>
                  <div style={{ fontSize:10, color:"#81c784", opacity:0.7 }}>{station ? "📡 Mesures de ta station" : `${MONTHS_FR[month]} — ${plan.label}`}</div>
                </div>
                <button onClick={refreshLocation} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, padding:"4px 8px", color:"#e8f5e9", fontSize:11, cursor:"pointer" }}>
                  {locLoading ? "⌛" : "🔄"}
                </button>
              </div>
              {weather ? (
                <div style={{ display:"flex", flexDirection:"column", gap:6, flex:1 }}>
                  {[
                    typeof station?.temp === "number"
                      ? { icon:"🌡️", val:`${Math.round(station.temp)}°C`, label:"Au jardin, maintenant" }
                      : { icon:getWMO(weather.code).icon, val:`${Math.round(weather.temp_max)}°C`, label:getWMO(weather.code).label },
                    { icon:"💨", val:`${weather.wind}km/h`, label:"Vent" },
                    { icon:"💧", val:`${weather.precip}mm`, label:"Pluie" },
                  ].map(({ icon, val, label }) => (
                    <div key={label} style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.06)", borderRadius:10, padding:"8px 10px", flex:1 }}>
                      <span style={{ fontSize:20 }}>{icon}</span>
                      <div>
                        <div style={{ fontSize:15, fontWeight:800, lineHeight:1 }}>{val}</div>
                        <div style={{ fontSize:9, color:"#81c784" }}>{label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#81c784", fontSize:12 }}>
                  {loading || locLoading ? "🌿 Détection..." : "🔄 Actualiser"}
                </div>
              )}
            </div>
          ) : (
            <div data-tuile="accueil-meteo" style={{ ...card(), display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:14 }}>
              <div style={{ fontSize:12, color:"#81c784", marginBottom:8 }}>🔒 Météo temps réel</div>
              <button onClick={() => navigate("/subscribe")} style={{ background:"linear-gradient(135deg,#F59E0B,#D97706)", color:"#1a1a1a", fontWeight:800, border:"none", borderRadius:8, cursor:"pointer", padding:"6px 14px", fontSize:11 }}>Premium</button>
            </div>
          )}
        </div>

        {/* ── ALERTES MÉTÉO ─────────────────────────────────────────────────── */}
        {isPaid && alerts.map((a, i) => <AlertBanner key={i} alert={a} />)}

        {/* ── AUJOURD'HUI (résumé ; détail, validation et produits dans l'onglet Aujourd'hui) ───── */}
        <div data-tuile="accueil-aujourdhui" role="button" onClick={() => navigate("/today")} style={{ ...card(), padding:14, cursor:"pointer" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <span style={{ fontWeight:700, color:"#66BB6A", fontSize:14 }}>📅 Aujourd'hui</span>
            <span style={{ fontSize:11, color:"#81c784" }}>
              {recommended.length ? `${recommended.length} action${recommended.length > 1 ? "s" : ""} à faire` : "Tout est à jour"}
            </span>
          </div>
          {recommended.slice(0, 3).map(({ action, isManuel, parcoursLabel }) => (
            <div key={action.id} style={{ padding:"9px 12px", marginBottom:6, background:"rgba(102,187,106,0.08)", border:"1px solid rgba(102,187,106,0.2)", borderRadius:10, fontSize:13, fontWeight:700, color:"#e8f5e9" }}>
              {parcoursLabel || (isManuel ? "Désherbage Manuel 🌿" : action.label)}
            </div>
          ))}
          {recommended.length === 0 && (
            <div style={{ fontSize:13, color:"#a5d6a7", lineHeight:1.5, marginBottom:6 }}>
              ✅ Rien à faire aujourd'hui{prochaine ? ` · prochaine action : ${prochaine.action.label}, dans ${prochaine.daysLeft} j` : ""}.
            </div>
          )}
          <div style={{ fontSize:12, fontWeight:700, color:"#a5d6a7", textAlign:"right" }}>
            {recommended.length > 3 ? `Voir les ${recommended.length} actions →` : recommended.length ? "Faire et valider →" : "Voir ma journée →"}
          </div>
        </div>

        {/* ── SÉRIE ET GREENPOINTS (résumé ; classement et badges dans Mon gazon) ──────────────── */}
        <div data-tuile="accueil-progres" role="button" onClick={() => navigate("/my-lawn#progres")} style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12, cursor:"pointer" }}>
          <div style={{ ...card(), marginBottom:0, padding:"10px 12px", display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:22 }}>{modeHiver ? "🛡️" : enDanger ? "⚠️" : "🔥"}</span>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color: enDanger ? "#ef9a9a" : "#a5d6a7" }}>{streak} jour{streak > 1 ? "s" : ""}</div>
              <div style={{ fontSize:10, color:"#81c784" }}>{modeHiver ? "Série protégée" : enDanger ? "Série en danger" : "Série"}</div>
            </div>
          </div>
          <div style={{ ...card(), marginBottom:0, padding:"10px 12px", display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:22 }}>{palier?.icone || "🌿"}</span>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:"#a5d6a7" }}>{gpTotal.toLocaleString("fr-FR")} pts</div>
              <div style={{ fontSize:10, color:"#81c784" }}>GreenPoints{palier?.label ? ` · ${palier.label}` : ""}</div>
            </div>
          </div>
        </div>

        {/* ── BILAN DE SAISON (du 15 novembre à fin février ; toute l'année dans Mon gazon) ──────── */}
        {bilanDisponible() && (
          <div data-tuile="accueil-bilan" role="button" onClick={() => navigate("/bilan")} style={{ ...card(), padding:"12px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, cursor:"pointer", background:"linear-gradient(135deg,rgba(249,168,37,0.22),rgba(13,43,26,0.4))", border:"1px solid rgba(249,168,37,0.45)" }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#f9a825" }}>🏆 Ton bilan de saison {anneeDuBilan()} est prêt</span>
            <span style={{ color:"#f9a825" }}>›</span>
          </div>
        )}

        {/* ── PREMIUM : équipements et plan annuel (comptes Premium) ou ce que Premium ajoute (gratuits, hors app Android) ── */}
        {isPaid ? (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
            {[
              { tuile:"accueil-equipements", route:"/equipements", icone:"🔌", titre:"Mes équipements", detail:"Station, robot, arrosage" },
              { tuile:"accueil-plan-annuel", route:"/plan-annuel", icone:"📅", titre:"Mon plan annuel", detail:"Les 12 mois, en PDF" },
            ].map(r => (
              <div key={r.tuile} data-tuile={r.tuile} role="button" onClick={() => navigate(r.route)} style={{ ...card(), marginBottom:0, padding:12, cursor:"pointer" }}>
                <div style={{ fontSize:22 }}>{r.icone}</div>
                <div style={{ fontSize:13, fontWeight:800, color:"#F1F8F2", marginTop:4 }}>{r.titre}</div>
                <div style={{ fontSize:11, color:"#81c784", lineHeight:1.4 }}>{r.detail}</div>
              </div>
            ))}
          </div>
        ) : !subLoading && !isAndroidTWA() && <AvecPremium tuile="accueil-avec-premium" />}

        {/* ── CONSEILS GAZON (rubrique statique /conseils, hors de l'app) ───── */}
        <a data-tuile="accueil-conseils" href="/conseils" style={{ ...card(), display:"flex", alignItems:"center", gap:12, textDecoration:"none", color:"inherit" }}>
          <span style={{ fontSize:24 }}>📚</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:800, color:"#F1F8F2" }}>Conseils gazon</div>
            <div style={{ fontSize:12, color:"#81c784", lineHeight:1.5 }}>Nos guides saison par saison : tonte, arrosage, mousse, semis…</div>
          </div>
          <span style={{ color:"#81c784", fontSize:18 }}>›</span>
        </a>

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

        {/* ✅ Signature finale avec ® + slogan + mention marque (enregistrée EUIPO le 22/09/2026) */}
        <div style={{ textAlign:"center", padding:"8px 0 24px" }}>
          <div style={{ fontSize:10, color:"#2d4a35", fontStyle:"italic" }}>
            🌿 Mongazon360<sup style={{ fontSize:7 }}>®</sup> — Tant qu'il y a gazon, il y a match
          </div>
          <div style={{ fontSize:9, color:"#1f3326", marginTop:2 }}>
            Marque déposée et enregistrée à l'EUIPO
          </div>
        </div>

      </div>

      {/* ── Modal GreenScore (mention 6 avocat) ──────────────────────────── */}
      {showScoreInfo && <GreenScoreModal onClose={() => setShowScoreInfo(false)} />}
    </div>
  );
}


// ── Carte Parcours : affiche l'état du parcours en cours sur l'accueil ──────────
function CarteParcours({ parcours }) {
  const navigate = useNavigate();
  if (!parcours) return null;

  const typeLabel = parcours.type === "regarnissage" ? "regarnissage" : "semis";

  if (parcours.statut === "en_attente_fenetre") {
    return (
      <div data-tuile="accueil-parcours" style={{ background:"linear-gradient(135deg,rgba(255,193,7,0.15),rgba(13,43,26,0.6))", border:"1px solid rgba(255,193,7,0.35)", borderRadius:14, padding:"14px 16px", marginBottom:4, display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:24, flexShrink:0 }}>⏳</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:800, color:"#F1F8F2", marginBottom:3 }}>Projet de {typeLabel} enregistré</div>
          <div style={{ fontSize:12, color:"#ffe082", lineHeight:1.5 }}>
            On surveille la météo de votre zone. Vous serez prévenu dès l'ouverture de la fenêtre.
          </div>
        </div>
        <div role="button" onClick={() => navigate("/parcours")}
          style={{ flexShrink:0, padding:"8px 14px", borderRadius:10, background:"rgba(255,193,7,0.25)", border:"1px solid rgba(255,193,7,0.4)", color:"#ffe082", fontWeight:800, fontSize:12, cursor:"pointer" }}>
          Voir
        </div>
      </div>
    );
  }

  if (parcours.statut === "actif") {
    return (
      <div data-tuile="accueil-parcours" style={{ background:"linear-gradient(135deg,rgba(76,175,80,0.25),rgba(13,43,26,0.6))", border:"1px solid rgba(102,187,106,0.4)", borderRadius:14, padding:"14px 16px", marginBottom:4, display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:24, flexShrink:0 }}>🌱</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:800, color:"#F1F8F2", marginBottom:3 }}>Parcours de {typeLabel} en cours</div>
          <div style={{ fontSize:12, color:"#a5d6a7", lineHeight:1.5 }}>Suivez votre programme jour par jour.</div>
        </div>
        <div role="button" onClick={() => navigate("/parcours")}
          style={{ flexShrink:0, padding:"8px 14px", borderRadius:10, background:"linear-gradient(135deg,#43a047,#2e7d32)", color:"#fff", fontWeight:800, fontSize:12, cursor:"pointer" }}>
          Suivre
        </div>
      </div>
    );
  }

  return null;
}
