import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../lib/useProfile";
import { useHistory } from "../lib/useHistory";
import { useWeather } from "../lib/useWeather";
import { useSubscription } from "../lib/useSubscription";
import { useReminders } from "../lib/useReminders";
import { useRecommandations } from "../lib/useRecommandations";
import { useSaison } from "../lib/useSaison";
import { calcLawnScore } from "../lib/lawnScore";
import { MONTHLY_PLAN, MONTHS_FR, calcArrosage } from "../lib/lawn";
import { card, cardTitle, btn, scroll, header } from "../lib/styles";

// ── Data Phase 2 ─────────────────────────────────────────────────────────────
const SOLS = [
  { id:"argileux", label:"Argileux",    icon:"🏔️" },
  { id:"sableux",  label:"Sableux",     icon:"🏖️" },
  { id:"limoneux", label:"Limoneux",    icon:"🌍" },
  { id:"calcaire", label:"Calcaire",    icon:"🪨" },
  { id:"humifere", label:"Humifère",    icon:"🌱" },
  { id:"compacte", label:"Compacté",    icon:"🧱" },
  { id:"inconnu",  label:"Je ne sais pas", icon:"🤷" },
];
const EXPOSITIONS = [
  { id:"ensoleille", label:"Ensoleillé",  icon:"☀️" },
  { id:"mi-ombre",   label:"Mi-ombre",    icon:"⛅" },
  { id:"ombrage",    label:"Ombragé",     icon:"🌥️" },
];
const ARROSAGES = [
  { id:"automatique", label:"Arrosage automatique", icon:"🤖" },
  { id:"manuel",      label:"Tuyau / manuel",        icon:"🪣" },
  { id:"aucun",       label:"Pas d'arrosage",        icon:"❌" },
  { id:"rarement",    label:"Rarement / je ne sais pas", icon:"🤷" },
];
const TONDEUSES = [
  { id:"electrique_filaire",  label:"Électrique filaire",   icon:"🔌" },
  { id:"electrique_batterie", label:"Électrique batterie",  icon:"🔋" },
  { id:"thermique",           label:"Thermique",             icon:"⛽" },
  { id:"robot",               label:"Robot tondeuse",        icon:"🤖" },
  { id:"helicoidale",         label:"Hélicoïdale",           icon:"🔧" },
  { id:"autoportee",          label:"Autoportée / Rider",    icon:"🚜" },
  { id:"inconnu",             label:"Je ne sais pas",        icon:"🤷" },
];
const MATERIELS = [
  { id:"scarificateur",   label:"Scarificateur",      icon:"🔩" },
  { id:"aerateur",        label:"Aérateur",           icon:"🌀" },
  { id:"debroussailleuse",label:"Débroussailleuse",   icon:"✂️" },
  { id:"epandeur",        label:"Épandeur",            icon:"🌱" },
  { id:"pulverisateur",   label:"Pulvérisateur",      icon:"💧" },
  { id:"motoculteur",     label:"Motoculteur",         icon:"🚜" },
  { id:"rouleau",         label:"Rouleau à gazon",     icon:"🛞" },
  { id:"arroseur",        label:"Arroseur/programmateur", icon:"⏱️" },
  { id:"souffleur",       label:"Souffleur",           icon:"💨" },
  { id:"raclette",        label:"Raclette/lame niveleuse", icon:"📐" },
  { id:"aucun",           label:"Aucun matériel",      icon:"❌" },
];
const BUDGETS = [
  { id:"0-50",    label:"0–50 € / an",     icon:"💶" },
  { id:"50-150",  label:"50–150 € / an",   icon:"💶" },
  { id:"150-300", label:"150–300 € / an",  icon:"💶" },
  { id:"300-600", label:"300–600 € / an",  icon:"💶" },
  { id:"600+",    label:"Plus de 600 € / an", icon:"💶" },
  { id:"inconnu", label:"Je ne sais pas",  icon:"🤷" },
];

// Matériel spécifique gazon synthétique
const MATERIELS_SYNTH = [
  { id:"brosse",    label:"Brosse",              icon:"🧹" },
  { id:"souffleur", label:"Souffleur",           icon:"💨" },
  { id:"hp",        label:"Nettoyeur haute pression", icon:"🚿" },
  { id:"aspirateur",label:"Aspirateur",          icon:"🌀" },
  { id:"aucun",     label:"Aucun",               icon:"❌" },
];

// ── Calcul complétude profil ──────────────────────────────────────────────────
function calcCompletion(profile, isPaid) {
  if (!profile) return 0;
  const p2Fields = [
    profile.sol && profile.sol !== "N/A",
    profile.exposition,
    profile.arrosage && profile.arrosage !== "N/A",
    profile.tondeuse?.length > 0,
    profile.materiel?.length > 0,
    profile.budget,
  ];
  const p2Done = p2Fields.filter(Boolean).length;
  const p2Pct  = Math.round((p2Done / 6) * 50); // 0→50%
  const base   = 40; // Phase 1
  const total  = Math.min(90, base + p2Pct); // max 90% sans diag photo
  return total;
}

const PRODUCTS = [
  { name:"Anti-mousse liquide",    score:"+15", price:"18,50€", icon:"🌿", reason:"Mousse détectée" },
  { name:"Engrais azoté NPK",      score:"+10", price:"24,90€", icon:"🌱", reason:"Carence nutriments" },
  { name:"Biostimulant racinaire", score:"+8",  price:"29,90€", icon:"💧", reason:"Stress hydrique" },
];

function ShareScore({ score, label, profile }) {
  const [copied, setCopied]     = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const appUrl        = "https://mongazon360.fr";
  const emoji         = score >= 85 ? "🏆" : score >= 70 ? "😊" : score >= 55 ? "😐" : score >= 40 ? "😟" : "😰";
  const gazon         = profile?.pelouse ? ` Mon ${profile.pelouse}` : " Mon gazon";
  const surface       = profile?.surface ? ` (${profile.surface}m²)` : "";
  const message       = `${emoji}${gazon}${surface} a un score de santé de ${score}/100 sur Mon Gazon 360 !\n🌿 "${label}"\n\nSuivez votre gazon en temps réel :\n${appUrl}`;
  const messageEncoded = encodeURIComponent(message);
  const urlEncoded    = encodeURIComponent(appUrl);
  const SHARE_OPTIONS = [
    { id:"whatsapp", icon:"💬", label:"WhatsApp",    color:"#25D366", bg:"rgba(37,211,102,0.15)",  border:"rgba(37,211,102,0.35)",  action: () => window.open(`https://wa.me/?text=${messageEncoded}`, "_blank") },
    { id:"facebook", icon:"📘", label:"Facebook",    color:"#1877F2", bg:"rgba(24,119,242,0.15)",  border:"rgba(24,119,242,0.35)",  action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${urlEncoded}&quote=${messageEncoded}`, "_blank") },
    { id:"twitter",  icon:"🐦", label:"Twitter / X", color:"#1DA1F2", bg:"rgba(29,161,242,0.15)",  border:"rgba(29,161,242,0.35)",  action: () => window.open(`https://twitter.com/intent/tweet?text=${messageEncoded}`, "_blank") },
    { id:"instagram",icon:"📸", label:"Instagram",   color:"#E1306C", bg:"rgba(225,48,108,0.15)",  border:"rgba(225,48,108,0.35)",  action: () => { navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 3000); } },
    { id:"copy",     icon:"🔗", label:"Copier",      color:"#a5d6a7", bg:"rgba(165,214,167,0.1)",  border:"rgba(165,214,167,0.25)", action: () => { navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 3000); } },
  ];
  return (
    <div style={{ marginTop:12 }}>
      <button onClick={() => setShowPanel(!showPanel)} style={{ ...btn.ghost, fontSize:13, display:"flex", alignItems:"center", gap:8, justifyContent:"center" }}>
        📤 Partager mon score {showPanel ? "▲" : "▼"}
      </button>
      {showPanel && (
        <div style={{ marginTop:10 }}>
          <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"12px 14px", marginBottom:12 }}>
            <div style={{ fontSize:10, color:"#81c784", fontWeight:700, marginBottom:6, letterSpacing:1 }}>APERÇU DU MESSAGE</div>
            <div style={{ fontSize:12, color:"#e8f5e9", lineHeight:1.7, whiteSpace:"pre-line" }}>{message}</div>
          </div>
          {copied && <div style={{ background:"rgba(67,160,71,0.2)", border:"1px solid rgba(67,160,71,0.4)", borderRadius:10, padding:"8px 12px", marginBottom:10, fontSize:12, color:"#a5d6a7", textAlign:"center" }}>✅ Message copié !</div>}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {SHARE_OPTIONS.map(opt => (
              <button key={opt.id} onClick={opt.action} style={{ background:opt.bg, border:`1px solid ${opt.border}`, borderRadius:12, padding:"10px 8px", color:opt.color, fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <span style={{ fontSize:16 }}>{opt.icon}</span>{opt.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize:10, color:"#4a7c5c", textAlign:"center", marginTop:8 }}>📱 Instagram : le message est copié — collez-le dans votre story</div>
        </div>
      )}
    </div>
  );
}

export default function MyLawn() {
  const navigate           = useNavigate();
  const { profile, saveProfile } = useProfile();
  const { history = [] }   = useHistory();
  const { weather }        = useWeather() || {};
  const { isPaid = false } = useSubscription() || {};
  const { activeCount }    = useReminders();
  const [period, setPeriod] = useState("7j");

  // ── État complétion profil ──────────────────────────────────────────────
  const [p2, setP2] = useState({
    sol:        profile?.sol        || null,
    exposition: profile?.exposition || null,
    arrosage:   profile?.arrosage   || null,
    tondeuse:   profile?.tondeuse   || [],
    materiel:   profile?.materiel   || [],
    budget:     profile?.budget     || null,
  });

  const isSynthetique = profile?.isSynthetique || profile?.pelouse === "synthetique";
  const completion    = calcCompletion(profile, isPaid);

  const toggleMulti = (field, id) => {
    setP2(prev => {
      const arr = prev[field] || [];
      if (id === "aucun") return { ...prev, [field]: ["aucun"] };
      const filtered = arr.filter(x => x !== "aucun");
      return {
        ...prev,
        [field]: filtered.includes(id) ? filtered.filter(x => x !== id) : [...filtered, id]
      };
    });
  };

  const handleSaveP2 = () => {
    const updated = { ...profile, ...p2 };
    updated.profileCompletion = calcCompletion(updated, isPaid);
    saveProfile(updated);
    setP2Saved(true);
    setTimeout(() => setP2Saved(false), 2500);
  };

  const month = new Date().getMonth() + 1;
  const plan  = MONTHLY_PLAN[month];
  const arros = profile && weather ? calcArrosage(month, profile, weather) : null;
  const { score, potential, label, color, issues, strengths, composantes } = calcLawnScore({ weather, profile, history, month });

  // ── Conseil du mois (nouveau) ──
  const { recommandationPrincipale } = useRecommandations(profile, score, weather);

  const historyMinus7      = history.filter(h => {
    const parts = h.date?.split('/');
    if (!parts || parts.length !== 3) return true; // garder si date invalide
    const d = new Date(parts[2], parts[1]-1, parts[0]);
    return Math.floor((Date.now() - d.getTime()) / 86400000) >= 7;
  });
  const { score: scoreLastWeek } = calcLawnScore({ weather, profile, history: historyMinus7, month });
  const scoreDiff          = score - scoreLastWeek;
  const countAction        = (kw) => history.filter(h => h.action.toLowerCase().includes(kw)).length;
  const actionsDisponibles = issues.reduce((acc, i) => acc + Math.abs(i.impact), 0);
  const projectionScore    = Math.min(100, score + Math.round(actionsDisponibles * 0.6));
  const projectionDays     = issues.length <= 2 ? 7 : 14;

  const scoreHistory = Array.from({ length: 7 }, (_, i) => {
    const daysAgo = 6 - i;
    if (daysAgo === 0) return score;
    const histFiltered = history.filter(h => {
      const parts = h.date?.split('/');
      if (!parts || parts.length !== 3) return false;
      const d = new Date(parts[2], parts[1]-1, parts[0]);
      return Math.floor((Date.now() - d.getTime()) / 86400000) >= daysAgo;
    });
    const { score: s } = calcLawnScore({ weather, profile, history: histFiltered, month });
    return s;
  });
  const maxScore = Math.max(...scoreHistory);
  const minScore = Math.min(...scoreHistory);

  return (
    <div>
      <div style={header}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <img src="/mg360-mascot-transparent.png" alt="MG360" style={{ width:40, height:40, objectFit:"contain" }} />
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:"#F1F8F2" }}>Mon Gazon</div>
              <div style={{ fontSize:12, color:"#66BB6A", opacity:0.9 }}>Centre de pilotage</div>
            </div>
          </div>
          <button onClick={() => navigate("/rappels")} style={{ background:"rgba(102,187,106,0.12)", border:"1px solid rgba(102,187,106,0.3)", borderRadius:10, padding:"7px 12px", color:"#66BB6A", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
            🔔 Rappels
            {activeCount > 0 && <span style={{ background:"#43a047", color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:10, fontWeight:700 }}>{activeCount}</span>}
          </button>
        </div>
      </div>

      <div style={scroll}>

        {/* ── BOUTON COMPLÉTER PROFIL ── */}
        <div style={{ marginBottom:12, display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(255,255,255,0.05)", border:`1px solid ${completion < 90 ? "rgba(244,162,97,0.25)" : "rgba(82,183,136,0.25)"}`, borderRadius:14, padding:"10px 14px" }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color: completion < 90 ? "#f4a261" : "#95d5b2" }}>👤 Profil complété à {completion}%</div>
            <div style={{ fontSize:11, color:"#81c784", marginTop:2 }}>
              {completion < 90 ? "Complétez pour de meilleurs conseils" : "Modifier vos informations à tout moment"}
            </div>
          </div>
          <button onClick={() => navigate("/setup")} style={{ background: completion < 90 ? "rgba(244,162,97,0.2)" : "rgba(82,183,136,0.15)", border:`1px solid ${completion < 90 ? "rgba(244,162,97,0.4)" : "rgba(82,183,136,0.3)"}`, borderRadius:10, padding:"7px 12px", color: completion < 90 ? "#f4a261" : "#95d5b2", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
            ✏️ {completion < 90 ? "Compléter →" : "Modifier →"}
          </button>
        </div>

        {/* ── 1. SCORE HÉRO ── */}
        <div style={{ ...card(), background:`linear-gradient(135deg, rgba(27,94,32,0.5), rgba(13,43,26,0.7))`, border:`2px solid ${color}55`, padding:20 }}>
          <div style={{ fontSize:11, color:"#66BB6A", fontWeight:700, letterSpacing:1.5, marginBottom:12, textAlign:"center" }}>🌿 SCORE SANTÉ</div>
          <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:24, marginBottom:12 }}>
            {/* Cercle score — même style que Dashboard */}
            <div style={{ position:"relative" }}>
              <svg width="160" height="100" viewBox="0 0 160 100">
                <path d="M 15 90 A 65 65 0 0 1 145 90" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" strokeLinecap="round"/>
                <path d="M 15 90 A 65 65 0 0 1 145 90" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={`${(score/100)*204} 204`}/>
                <text x="80" y="82" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold" fontFamily="Nunito,Arial">{score}</text>
                <text x="80" y="95" textAnchor="middle" fill={color} fontSize="11" fontFamily="Nunito,Arial">/100 — {label}</text>
              </svg>
            </div>
            {/* Stats droite */}
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:20, marginBottom:2 }}>{scoreDiff >= 0 ? "📈" : "📉"}</div>
                <div style={{ fontSize:16, fontWeight:800, color: scoreDiff >= 0 ? "#66BB6A" : "#ef9a9a" }}>{scoreDiff >= 0 ? "+" : ""}{scoreDiff}</div>
                <div style={{ fontSize:10, color:"#81c784" }}>vs 7 jours</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:10, color:"#81c784", marginBottom:2 }}>Potentiel</div>
                <div style={{ fontSize:14, fontWeight:800, color:"#f9a825" }}>{potential}</div>
                <div style={{ fontSize:9, color:"#81c784" }}>/100</div>
              </div>
            </div>
          </div>
          <div style={{ marginTop:14, background:"rgba(249,168,37,0.15)", borderRadius:12, padding:"10px 14px", border:"1px solid rgba(249,168,37,0.3)" }}>
            {isPaid ? (
              <>
                <div style={{ fontSize:12, fontWeight:700, color:"#f9a825" }}>🎯 Projection personnalisée</div>
                <div style={{ fontSize:13, color:"#e8f5e9", marginTop:4 }}>En suivant le plan → <span style={{ fontWeight:800, color:"#a5d6a7" }}>{projectionScore}/100</span> dans <span style={{ fontWeight:800 }}>{projectionDays} jours</span></div>
              </>
            ) : (
              <>
                <div style={{ fontSize:12, fontWeight:700, color:"#f9a825" }}>🎯 Projection personnalisée</div>
                <div style={{ fontSize:13, color:"#81c784", marginTop:4 }}>🔒 Score projeté disponible en <span style={{ cursor:"pointer", textDecoration:"underline", color:"#f9a825" }} onClick={() => navigate("/subscribe")}>Premium</span></div>
              </>
            )}
          </div>
          <ShareScore score={score} label={label} profile={profile} />
        </div>

        {/* ── 2. CONSEIL DU MOIS ── */}
        {recommandationPrincipale && (
          <div style={{ ...card(), border:`2px solid ${recommandationPrincipale.urgence === "haute" ? "rgba(198,40,40,0.5)" : "rgba(102,187,106,0.4)"}`, background:`linear-gradient(135deg, ${recommandationPrincipale.urgence === "haute" ? "rgba(198,40,40,0.12)" : "rgba(15,47,31,0.7)"}, rgba(27,94,32,0.3))` }}>
            <div style={cardTitle}>
              <span style={{ fontSize:13 }}>{recommandationPrincipale.icone} Conseil du mois</span>
              <span style={{ fontSize:11, background: recommandationPrincipale.urgence === "haute" ? "rgba(198,40,40,0.2)" : "rgba(102,187,106,0.2)", color: recommandationPrincipale.urgence === "haute" ? "#ef9a9a" : "#66BB6A", borderRadius:20, padding:"2px 10px", fontWeight:700 }}>
                {recommandationPrincipale.urgence === "haute" ? "🔴 Maintenant" : "🟡 Bientôt"}
              </span>
            </div>
            <div style={{ fontWeight:800, color:"#F1F8F2", fontSize:15, marginBottom:8 }}>{recommandationPrincipale.label}</div>
            <div style={{ fontSize:12, color:"#A5D6A7", lineHeight:1.6, marginBottom:12 }}>{recommandationPrincipale.message(score, profile)}</div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ background:"rgba(102,187,106,0.2)", color:"#66BB6A", borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:700, border:"1px solid rgba(102,187,106,0.3)" }}>📈 {recommandationPrincipale.impact_score}</span>
              <button onClick={() => navigate("/products")} style={{ marginLeft:"auto", background:"linear-gradient(135deg,#43A047,#2E7D32)", color:"#fff", border:"none", borderRadius:10, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer", boxShadow:"0 2px 8px rgba(46,125,50,0.4)" }}>Voir le produit →</button>
            </div>
          </div>
        )}

        {/* ── 3. DÉTAIL DU SCORE ── */}

        <div style={card()}>
          <div style={cardTitle}><span>📊 Détail du score</span>{!isPaid && <span style={{ fontSize:10, color:"#f9a825" }}>🔒 Premium</span>}</div>
          {[
            { icon:"🌱", label:"Entretien régulier", val: composantes?.entretien  ?? 70 },
            { icon:"💧", label:"Hydratation",         val: composantes?.hydratation ?? 70 },
            { icon:"🧪", label:"Nutriments",          val: composantes?.nutriments  ?? 70 },
            { icon:"🌿", label:"Sol & aération",      val: composantes?.sol         ?? 75 },
          ].map((item, i) => (
            <div key={i} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                <span>{item.icon} {item.label}</span>
                {isPaid || i < 2 ? <span style={{ fontWeight:700, color: item.val >= 70 ? "#a5d6a7" : item.val >= 50 ? "#f9a825" : "#ef9a9a" }}>{item.val}/100</span> : <span style={{ color:"#f9a825", fontSize:11 }}>🔒 Premium</span>}
              </div>
              {(isPaid || i < 2) && <div style={{ height:6, background:"rgba(255,255,255,0.1)", borderRadius:6, overflow:"hidden" }}><div style={{ width:`${item.val}%`, height:"100%", background: item.val >= 70 ? "#43a047" : item.val >= 50 ? "#f9a825" : "#c62828", borderRadius:6 }} /></div>}
            </div>
          ))}
          {!isPaid && <button onClick={() => navigate("/subscribe")} style={{ ...btn.primary, fontSize:12, padding:"8px 16px", width:"auto", marginTop:4 }}>⭐ Voir le détail complet</button>}
        </div>

        {/* ── 6. PROBLÈMES PRIORITAIRES ── */}
        {issues.length > 0 && (
          <div style={card()}>
            <div style={cardTitle}><span>⚠️ Problèmes prioritaires</span></div>
            {(isPaid ? issues : issues.slice(0,2)).map((issue, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 10px", background:"rgba(239,108,0,0.1)", borderRadius:10, marginBottom:6, border:"1px solid rgba(239,108,0,0.2)" }}>
                <span style={{ fontSize:13 }}>{issue.icon} {issue.label}</span>
                <span style={{ fontSize:12, fontWeight:700, color:"#ef9a9a" }}>{issue.impact} pts</span>
              </div>
            ))}
            {!isPaid && issues.length > 2 && <div style={{ fontSize:12, color:"#f9a825", textAlign:"center", marginTop:6 }}>🔒 +{issues.length - 2} problème{issues.length-2>1?"s":""} masqué{issues.length-2>1?"s":""} — <span style={{ cursor:"pointer", textDecoration:"underline" }} onClick={() => navigate("/subscribe")}>Premium</span></div>}
          </div>
        )}

        {/* ── 7. PLAN DU MOIS ── */}
        <div style={card()}>
          <div style={cardTitle}><span>📅 Plan {MONTHS_FR[month]}</span></div>
          <div style={{ fontSize:13, color:"#f9a825", fontWeight:700, marginBottom:8 }}>{plan?.label}</div>
          {[
            { icon:"✂️", label:"Tonte",    val:plan?.tonte },
            { icon:"🌱", label:"Engrais",  val:plan?.engrais || "Aucun ce mois" },
            { icon:"🔧", label:"Verticut", val:plan?.verticut ? "À prévoir" : "Non requis" },
            { icon:"🌀", label:"Aération", val:plan?.aeration ? "Recommandée" : "Non requise" },
          ].map(({ icon, label, val }) => (
            <div key={label} style={{ display:"flex", gap:10, padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize:16, minWidth:24 }}>{icon}</span>
              <div><div style={{ fontSize:10, color:"#81c784", fontWeight:700 }}>{label}</div><div style={{ fontSize:12 }}>{val}</div></div>
            </div>
          ))}
        </div>

        {/* ── 8. ÉVOLUTION DU SCORE ── */}
        <div style={card()}>
          <div style={cardTitle}>
            <span>📈 Évolution du score</span>
            <div style={{ display:"flex", gap:6 }}>
              {["7j","30j"].map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{ background: period===p ? "rgba(76,175,80,0.3)" : "none", border:`1px solid ${period===p ? "#43a047" : "rgba(255,255,255,0.2)"}`, borderRadius:8, padding:"2px 8px", color: period===p ? "#a5d6a7" : "#81c784", fontSize:11, cursor:"pointer" }}>{p}</button>
              ))}
            </div>
          </div>
          <div style={{ position:"relative", height:80, marginTop:8 }}>
            <svg width="100%" height="80" viewBox="0 0 300 80" preserveAspectRatio="none">
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#66BB6A" stopOpacity="0.4"/>
                  <stop offset="100%" stopColor="#66BB6A" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {(() => {
                const pts    = scoreHistory;
                const range  = maxScore - minScore || 1;
                const coords = pts.map((v, i) => ({ x: (i / (pts.length-1)) * 300, y: 70 - ((v - minScore) / range) * 60 }));
                const pathD  = coords.map((p,i) => `${i===0?"M":"L"} ${p.x} ${p.y}`).join(" ");
                const areaD  = pathD + ` L 300 70 L 0 70 Z`;
                return (<>
                  <path d={areaD} fill="url(#scoreGrad)"/>
                  <path d={pathD} fill="none" stroke="#66BB6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  {coords.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#43a047"/>)}
                  <text x={coords[coords.length-1].x - 15} y={coords[coords.length-1].y - 8} fill="#a5d6a7" fontSize="10" fontWeight="bold">{score}</text>
                </>);
              })()}
            </svg>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#81c784", marginTop:4 }}><span>Il y a 7 jours</span><span>Aujourd'hui</span></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:12 }}>
            {[{ icon:"✂️", label:"Tontes", val:countAction("tonte") },{ icon:"💧", label:"Arrosages", val:countAction("arrosage") },{ icon:"🌱", label:"Engrais", val:countAction("engrais") }].map(({ icon, label, val }) => (
              <div key={label} style={{ background:"rgba(255,255,255,0.05)", borderRadius:10, padding:"8px", textAlign:"center" }}>
                <div style={{ fontSize:18 }}>{icon}</div>
                <div style={{ fontSize:16, fontWeight:800, color:"#a5d6a7" }}>{val}</div>
                <div style={{ fontSize:10, color:"#81c784" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 9. DERNIER DIAGNOSTIC ── */}
        <div style={{ ...card(), background:"linear-gradient(135deg,rgba(25,118,210,0.12),rgba(13,43,26,0.6))", border:"1px solid rgba(33,150,243,0.3)" }}>
          <div style={cardTitle}>
            <span>🔬 Diagnostic IA</span>
            {!isPaid && <span style={{ fontSize:10, color:"#f9a825", background:"rgba(249,168,37,0.15)", borderRadius:20, padding:"2px 8px" }}>🔒 Premium</span>}
          </div>
          {isPaid ? (
            <div style={{ textAlign:"center", padding:"8px 0" }}>
              <div style={{ fontSize:48, marginBottom:8 }}>📸</div>
              <div style={{ fontSize:14, fontWeight:700, color:"#F1F8F2", marginBottom:6 }}>Analysez votre gazon en photo</div>
              <div style={{ fontSize:12, color:"#81c784", lineHeight:1.6, marginBottom:16 }}>
                Détection des maladies, carences et zones mortes en moins de 10 secondes.
              </div>
              <button onClick={() => navigate("/diagnostic")} style={{ ...btn.primary, width:"auto", padding:"12px 28px", fontSize:14 }}>🔬 Lancer un diagnostic →</button>
            </div>
          ) : (
            <div style={{ padding:"8px 0" }}>
              <div style={{ display:"flex", gap:8, flexDirection:"column", marginBottom:16 }}>
                {["📈 +15 pts de score en moyenne après action","⚡ Résultat en moins de 10 secondes","🏆 +100 GreenPoints garantis"].map(f => (
                  <div key={f} style={{ fontSize:12, color:"#81c784" }}>✓ {f}</div>
                ))}
              </div>
              <button onClick={() => navigate("/subscribe")} style={{ ...btn.primary, fontSize:13, padding:"12px" }}>⭐ Passer Premium — 4,99€/mois</button>
            </div>
          )}
        </div>

        {/* ── 10. PRODUITS RECOMMANDÉS ── */}
        <div style={card()}>
          <div style={cardTitle}><span>🛒 Produits recommandés</span></div>
          <div style={{ fontSize:11, color:"#81c784", marginBottom:10, fontStyle:"italic", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span>Sélectionnés selon votre score</span>
            {isPaid && <span style={{ fontSize:10, color:"#66BB6A", background:"rgba(102,187,106,0.1)", border:"1px solid rgba(102,187,106,0.2)", borderRadius:20, padding:"2px 8px", fontStyle:"normal", fontWeight:700 }}>⭐ Personnalisés Premium</span>}
          </div>
          {PRODUCTS.slice(0, isPaid ? 3 : 1).map((p, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <span style={{ fontSize:24 }}>{p.icon}</span>
                <div><div style={{ fontSize:12, fontWeight:700 }}>{p.name}</div><div style={{ fontSize:10, color:"#81c784" }}>{p.reason}</div></div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:12, color:"#a5d6a7", fontWeight:700 }}>{p.score} pts</div>
                <div style={{ fontSize:11, color:"#f9a825" }}>{p.price}</div>
              </div>
            </div>
          ))}
          {!isPaid && <div style={{ fontSize:12, color:"#f9a825", textAlign:"center", marginTop:8 }}>🔒 +{PRODUCTS.length-1} produits masqués — <span style={{ cursor:"pointer", textDecoration:"underline" }} onClick={() => navigate("/subscribe")}>Premium</span></div>}
          <button onClick={() => navigate("/products")} style={{ ...btn.primary, marginTop:12, fontSize:12, padding:"8px" }}>Voir tous les produits →</button>
        </div>

        {/* ── 11. BLOC PREMIUM ── */}
        {!isPaid && (
          <div style={{ ...card(), background:"linear-gradient(135deg, rgba(249,168,37,0.15), rgba(230,81,0,0.1))", border:"1px solid rgba(249,168,37,0.4)", textAlign:"center" }}>
            <div style={{ fontSize:28, marginBottom:8 }}>⭐</div>
            <div style={{ fontSize:15, fontWeight:800, color:"#f9a825", marginBottom:8 }}>Passez Premium</div>
            {["Détail complet du score","Diagnostic illimité","Arrosage précis calculé","Produits personnalisés","Rappels push + email"].map(f => (
              <div key={f} style={{ fontSize:12, color:"#e8f5e9", padding:"3px 0" }}>✔ {f}</div>
            ))}
            <button onClick={() => navigate("/subscribe")} style={{ ...btn.primary, marginTop:14, padding:"12px 28px", fontSize:14 }}>⭐ Améliorer mon gazon — 4,99€/mois</button>
          </div>
        )}

        {/* ── 12. PROJECTION PERSONNALISÉE (Premium) ── */}
        {isPaid && (
          <div style={{ ...card(), background:"linear-gradient(135deg, rgba(27,94,32,0.3), rgba(13,43,26,0.5))", border:"1px solid rgba(165,214,167,0.3)", textAlign:"center", padding:20 }}>
            <div style={{ fontSize:11, color:"#81c784", fontWeight:700, letterSpacing:1, marginBottom:8 }}>📈 PROJECTION PERSONNALISÉE</div>
            <div style={{ fontSize:14, color:"#e8f5e9", lineHeight:1.6 }}>Si tu suis le plan cette semaine</div>
            <div style={{ fontSize:32, fontWeight:900, color:"#a5d6a7", margin:"8px 0" }}>{projectionScore}</div>
            <div style={{ fontSize:13, color:"#81c784" }}>Score estimé dans <strong style={{ color:"#a5d6a7" }}>{projectionDays} jours</strong></div>
            <div style={{ fontSize:12, color:"#f9a825", marginTop:8 }}>+{projectionScore - score} pts en suivant le plan ↗</div>
          </div>
        )}

        <div style={{ paddingBottom:32 }} />
      </div>
    </div>
  );
}
