// src/pages/MyLawn.jsx
// Mon gazon, épuré (décision de Jordan du 29/10/2026) : score santé compact et son détail, évolution du score, actions,
// progrès et badges, outils, profil ; « Avec Premium » pour les comptes gratuits.
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useProfile } from "../lib/useProfile";
import { useHistory } from "../lib/useHistory";
import { useWeather } from "../lib/useWeather";
import { useSubscription } from "../lib/useSubscription";
import { calcLawnScore } from "../lib/lawnScore";
import { useDiagnostics } from "../lib/useDiagnostics";
import { DEBIT_DEFAULT_MMH } from "../lib/lawn";
import { card, cardTitle, scroll, header } from "../lib/styles";
import { isAndroidTWA } from "../lib/platform";
import { useStreak } from "../lib/useStreak";
import { useBadges } from "../lib/useBadges";
import BadgesGallery from "../components/BadgesGallery";
import CarteParrainage from "../components/CarteParrainage";
import MesProgres from "../components/MesProgres";
import EvolutionScore from "../components/EvolutionScore";
import HistoriqueActions from "../components/HistoriqueActions";
import AvecPremium from "../components/AvecPremium";

// ── Calcul complétude profil ──────────────────────────────────────────────────
function calcCompletion(profile, isPaid, diagnostics) {
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
  const p2Pct  = Math.round((p2Done / 6) * 50);
  const base   = 40;
  // Profil complet à 90% sans diagnostic photo
  // Premium + au moins 1 diagnostic photo → 100%
  const hasDiag = isPaid && Array.isArray(diagnostics) && diagnostics.length > 0;
  const total   = hasDiag ? 100 : Math.min(90, base + p2Pct);
  return total;
}

const petitBouton = { flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(165,214,167,0.25)", borderRadius:10, padding:"7px 8px", color:"#a5d6a7", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" };

// Déplie au clavier un élément cliquable qui n'est pas un bouton
const auClavier = (action) => (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); action(); } };

function PartageScore({ score, label }) {
  const [copied, setCopied] = useState(false);
  const appUrl         = "https://mongazon360.fr";
  const emoji          = score >= 85 ? "🏆" : score >= 70 ? "😊" : score >= 55 ? "😐" : score >= 40 ? "😟" : "😰";
  const message        = `${emoji} Mon gazon a un score santé de ${score}/100 sur Mongazon360® !\n🌿 "${label}"\n\nSuivez votre gazon en temps réel :\n${appUrl}`;
  const messageEncoded = encodeURIComponent(message);
  const urlEncoded     = encodeURIComponent(appUrl);
  const copier = () => { navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 3000); };
  const SHARE_OPTIONS  = [
    { id:"whatsapp", icon:"💬", label:"WhatsApp",    color:"#25D366", bg:"rgba(37,211,102,0.15)",  border:"rgba(37,211,102,0.35)",  action: () => window.open(`https://wa.me/?text=${messageEncoded}`, "_blank") },
    { id:"facebook", icon:"📘", label:"Facebook",    color:"#1877F2", bg:"rgba(24,119,242,0.15)",  border:"rgba(24,119,242,0.35)",  action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${urlEncoded}&quote=${messageEncoded}`, "_blank") },
    { id:"twitter",  icon:"🐦", label:"Twitter / X", color:"#1DA1F2", bg:"rgba(29,161,242,0.15)",  border:"rgba(29,161,242,0.35)",  action: () => window.open(`https://twitter.com/intent/tweet?text=${messageEncoded}`, "_blank") },
    { id:"instagram",icon:"📸", label:"Instagram",   color:"#E1306C", bg:"rgba(225,48,108,0.15)",  border:"rgba(225,48,108,0.35)",  action: copier },
    { id:"copy",     icon:"🔗", label:"Copier",      color:"#a5d6a7", bg:"rgba(165,214,167,0.1)",  border:"rgba(165,214,167,0.25)", action: copier },
  ];
  return (
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
  );
}

// « Pourquoi ce score ? » : les 4 critères en texte (pas de chiffres internes, même lecture en gratuit et en Premium)
// et les problèmes prioritaires (2 pour un compte gratuit)
function DetailScore({ composantes, issues, isPaid, sansHistorique, onPremium }) {
  const e = composantes?.entretien   ?? 70;
  const h = composantes?.hydratation ?? 70;
  const n = composantes?.nutriments  ?? 70;
  const s = composantes?.sol         ?? 75;

  const getStatut = (val) => {
    if (val >= 80) return { label:"✅ Bon",           color:"#66BB6A", bg:"rgba(102,187,106,0.12)", border:"rgba(102,187,106,0.25)" };
    if (val >= 50) return { label:"⚠️ À surveiller", color:"#f9a825", bg:"rgba(249,168,37,0.12)",  border:"rgba(249,168,37,0.25)"  };
    return              { label:"🔴 À corriger",     color:"#ef9a9a", bg:"rgba(239,83,80,0.12)",   border:"rgba(239,83,80,0.25)"   };
  };

  const entretienCtx = () => {
    if (e >= 80) return "Entretien régulier — continuez comme ça";
    if (e >= 50) return "Quelques actions d'entretien à rattraper";
    return sansHistorique
      ? "Commencez à journaliser vos actions pour améliorer ce score"
      : "Tonte ou arrosage en retard — consultez l'onglet Aujourd'hui";
  };

  const hydratationCtx = () => {
    if (h >= 90) return "Conditions météo favorables à votre position";
    if (h >= 70) return "Légères contraintes météo détectées aujourd'hui";
    if (h >= 50) return "Chaleur ou sécheresse — pensez à arroser";
    return "Conditions difficiles — arrosage urgent si possible";
  };

  const nutrientsCtx = () => {
    if (n >= 70) return "Fertilisation à jour selon l'historique";
    if (n >= 30) return "Engrais recommandé — délai depuis la dernière application";
    return sansHistorique
      ? "Aucune fertilisation enregistrée — normal au démarrage"
      : "Aucun engrais journalisé depuis plus de 90 jours";
  };

  const solCtx = () => {
    if (s >= 80) return "Aucun facteur de risque détecté sur votre sol";
    if (s >= 50) return "Type de sol nécessite une attention particulière";
    return "Sol compacté ou argileux — aération recommandée";
  };

  const items = [
    { icon:"🌱", label:"Entretien",    val:e, ctx:entretienCtx()   },
    { icon:"💧", label:"Météo du jour", val:h, ctx:hydratationCtx() },
    { icon:"🧪", label:"Nutriments",   val:n, ctx:nutrientsCtx()   },
    { icon:"🌿", label:"Sol",           val:s, ctx:solCtx()         },
  ];

  return (
    <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:6 }}>
      {items.map((item) => {
        const statut = getStatut(item.val);
        return (
          <div key={item.label} style={{ background:statut.bg, border:`1px solid ${statut.border}`, borderRadius:10, padding:"8px 12px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:12, fontWeight:700, color:"#e8f5e9" }}>{item.icon} {item.label}</span>
              <span style={{ fontSize:10, fontWeight:800, color:statut.color, whiteSpace:"nowrap" }}>{statut.label}</span>
            </div>
            <div style={{ fontSize:11, color:"#81c784", lineHeight:1.4, marginTop:2 }}>{item.ctx}</div>
          </div>
        );
      })}
      {issues.length > 0 && (
        <div data-tuile="mongazon-problemes" style={{ marginTop:4 }}>
          <div style={{ fontSize:11, fontWeight:800, color:"#f4a261", margin:"2px 0 6px" }}>⚠️ Problèmes prioritaires</div>
          {(isPaid ? issues : issues.slice(0,2)).map((issue, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 10px", background:"rgba(239,108,0,0.1)", borderRadius:10, marginBottom:5, border:"1px solid rgba(239,108,0,0.2)" }}>
              <span style={{ fontSize:12 }}>{issue.icon} {issue.label}</span>
              <span style={{ fontSize:11, fontWeight:700, color:"#ef9a9a" }}>{issue.impact} pts</span>
            </div>
          ))}
          {!isPaid && issues.length > 2 && (
            <div style={{ fontSize:11, color:"#f9a825", textAlign:"center", marginTop:4 }}>
              🔒 +{issues.length - 2} problème{issues.length-2>1?"s":""} masqué{issues.length-2>1?"s":""} — <span role="button" tabIndex={0} onClick={onPremium} onKeyDown={auClavier(onPremium)} style={{ cursor:"pointer", textDecoration:"underline" }}>Premium</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Débit de l'arroseur (Premium) : il règle les durées d'arrosage de « Aujourd'hui »
function ReglageDebit({ debitMmH, saveDebit, debitSaved }) {
  return (
    <div style={{ marginTop:10 }}>
      <div style={{ fontSize:12, color:"#81c784", marginBottom:12, lineHeight:1.6 }}>
        Renseignez le débit de votre arroseur pour obtenir des durées d'arrosage précises. La durée s'ajuste automatiquement dans "Aujourd'hui".
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:14 }}>
        {[
          { label:"Arroseur oscillant", val:3.5 },
          { label:"Arroseur rotatif",   val:5   },
          { label:"Enrouleur tuyau",     val:8   },
          { label:"Micro-asperseur",     val:2   },
        ].map(({ label, val }) => (
          <button key={label} onClick={() => saveDebit(val)} style={{
            background: Math.abs(debitMmH - val) < 0.1 ? "rgba(100,181,246,0.3)" : "rgba(100,181,246,0.08)",
            border:     `1px solid ${Math.abs(debitMmH - val) < 0.1 ? "#64b5f6" : "rgba(100,181,246,0.25)"}`,
            borderRadius:10, padding:"8px 6px", cursor:"pointer", textAlign:"center",
          }}>
            <div style={{ fontSize:11, color:"#81c784", fontWeight:600 }}>{label}</div>
            <div style={{ fontSize:13, color:"#e8f5e9", fontWeight:800 }}>{val} mm/h</div>
          </button>
        ))}
      </div>
      <div style={{ marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ fontSize:12, color:"#81c784" }}>Réglage précis</span>
          <span style={{ fontSize:14, fontWeight:800, color:"#64b5f6" }}>{debitMmH.toFixed(1)} mm/h</span>
        </div>
        <input
          type="range" min="1" max="20" step="0.5" value={debitMmH}
          onChange={e => saveDebit(parseFloat(e.target.value))}
          style={{ width:"100%" }}
        />
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#4a7c5c", marginTop:2 }}>
          <span>1 mm/h</span><span>10 mm/h</span><span>20 mm/h</span>
        </div>
      </div>
      <div style={{ background:"rgba(100,181,246,0.08)", borderRadius:10, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:12, color:"#81c784" }}>Pour 7mm d'eau :</span>
        <span style={{ fontSize:16, fontWeight:800, color:"#64b5f6" }}>{Math.round((7 / debitMmH) * 60)} min</span>
      </div>

      {/* ── Tip calibrage boîte de conserve ── */}
      <div style={{ marginTop:14, background:"rgba(100,181,246,0.06)", border:"1px solid rgba(100,181,246,0.2)", borderRadius:12, padding:"12px 14px" }}>
        <div style={{ fontSize:12, fontWeight:800, color:"#64b5f6", marginBottom:6 }}>
          🥫 Comment mesurer votre débit réel ?
        </div>
        <div style={{ fontSize:12, color:"#81c784", lineHeight:1.7 }}>
          Posez une <strong style={{ color:"#e8f5e9" }}>boîte de conserve vide</strong> sur votre pelouse, à portée de l'arroseur. Lancez l'arrosage pendant <strong style={{ color:"#e8f5e9" }}>exactement 1h</strong>. Mesurez la hauteur d'eau accumulée en mm — c'est votre débit réel.
        </div>
        <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:5 }}>
          {[
            { step:"1", text:"Posez la boîte sur la pelouse, dans la zone arrosée" },
            { step:"2", text:"Arrosez 1h — ou faites une règle de 3 pour moins longtemps" },
            { step:"3", text:"Mesurez l'eau en mm avec une règle" },
            { step:"4", text:"Entrez la valeur dans le curseur ci-dessus" },
          ].map(({ step, text }) => (
            <div key={step} style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
              <span style={{ flexShrink:0, width:18, height:18, borderRadius:"50%", background:"rgba(100,181,246,0.25)", color:"#64b5f6", fontSize:10, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{step}</span>
              <span style={{ fontSize:11, color:"#a5d6a7", lineHeight:1.5 }}>{text}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop:10, fontSize:11, color:"#4a7c5c", fontStyle:"italic" }}>
          💡 Répétez le test en 2–3 points de votre pelouse et faites la moyenne pour plus de précision.
        </div>
      </div>

      {debitSaved && <div style={{ textAlign:"center", color:"#64b5f6", fontSize:12, marginTop:8 }}>✅ Débit enregistré</div>}
    </div>
  );
}

// Une tuile de « Mes outils »
function Outil({ tuile, icone, titre, sous, onClick, large }) {
  return (
    <div data-tuile={tuile} role="button" tabIndex={0} onClick={onClick} onKeyDown={auClavier(onClick)} style={{
      gridColumn: large ? "1 / -1" : undefined, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(165,214,167,0.18)",
      borderRadius:12, padding:"10px 12px", cursor:"pointer",
    }}>
      <div style={{ fontSize:18, lineHeight:1 }}>{icone}</div>
      <div style={{ fontSize:12, fontWeight:800, color:"#F1F8F2", marginTop:6 }}>{titre}</div>
      <div style={{ fontSize:10, color:"#81c784", marginTop:2, lineHeight:1.35 }}>{sous}</div>
    </div>
  );
}

const OBJECTIF_LABELS = { parfait:"Gazon parfait", fonctionnel:"Pelouse fonctionnelle", naturel:"Gazon naturel" };
const SOL_LABELS      = { argileux:"Argileux", limoneux:"Limoneux", sableux:"Sableux", calcaire:"Calcaire", humifere:"Humifère", compacte:"Compacté", inconnu:"Non défini" };
const EXPO_LABELS     = { ensoleille:"Ensoleillé", "mi-ombre":"Mi-ombre", ombrage:"Ombragé" };
const ARROSAGE_LABELS = { automatique:"Arrosage auto", manuel:"Tuyau/manuel", aucun:"Pas d'arrosage", rarement:"Rarement" };
const GAZON_LABELS    = { sport:"Sport", ombre:"Ombre / mi-ombre", sec:"Sec / méditerranéen", ornemental:"Ornemental", universel:"Universel", chaud:"Gazon chaud", inconnu:"Non défini" };

export default function MyLawn() {
  const navigate                  = useNavigate();
  const { hash }                  = useLocation();
  // Lien « Mes progrès » de l'accueil (/my-lawn#progres) : la section s'affiche directement
  useEffect(() => {
    if (hash !== "#progres") return;
    const id = setTimeout(() => document.getElementById("progres")?.scrollIntoView({ behavior: "smooth" }), 300);
    return () => clearTimeout(id);
  }, [hash]);
  const { profile, saveProfile }  = useProfile();
  const { history = [], removeEntry } = useHistory();
  const { weather }               = useWeather() || {};
  const { isPaid = false, isLoading: subLoading = true } = useSubscription() || {};
  const { diagnostics } = useDiagnostics(); // ✅ Déclaré en premier — utilisé dans calcCompletion et calcLawnScore

  // ── Débit arroseur (Premium) ────────────────────────────────────────────────
  // ✅ Phase 3 : source de vérité = profile.debit_arrosage_mmh (Supabase, multi-device)
  // Fallback localStorage pour migration douce des users existants.
  const [debitMmH, setDebitMmH] = useState(() => {
    // Priorité 1 : profile.debit_arrosage_mmh (Supabase)
    if (profile?.debit_arrosage_mmh && profile.debit_arrosage_mmh >= 1 && profile.debit_arrosage_mmh <= 20) {
      return profile.debit_arrosage_mmh;
    }
    // Priorité 2 : localStorage legacy (migration douce)
    try {
      const v = parseFloat(localStorage.getItem("mg360_debit_mmh"));
      return (!isNaN(v) && v >= 1 && v <= 20) ? v : DEBIT_DEFAULT_MMH;
    } catch { return DEBIT_DEFAULT_MMH; }
  });
  const [debitSaved, setDebitSaved] = useState(false);

  // ── Hydratation : si profile arrive après le mount, on resync l'état ────────
  useEffect(() => {
    if (profile?.debit_arrosage_mmh && profile.debit_arrosage_mmh !== debitMmH) {
      setDebitMmH(profile.debit_arrosage_mmh);
    }
  }, [profile?.debit_arrosage_mmh]); // eslint-disable-line

  // ── Backfill : si profile existe SANS debit_arrosage_mmh mais qu'on a un debit
  // en localStorage, on migre une fois vers Supabase.
  useEffect(() => {
    if (!profile || profile.debit_arrosage_mmh) return;
    try {
      const legacy = parseFloat(localStorage.getItem("mg360_debit_mmh"));
      if (!isNaN(legacy) && legacy >= 1 && legacy <= 20) {
        saveProfile({ ...profile, debit_arrosage_mmh: legacy });
        console.log("[MG360] Migration debit_arrosage_mmh →", legacy);
      }
    } catch {}
  }, [profile?.user_id]); // eslint-disable-line

  const saveDebit = (val) => {
    const v = Math.round(val * 10) / 10;
    setDebitMmH(v);
    // ✅ Source de vérité Supabase via profile.debit_arrosage_mmh
    if (profile) {
      saveProfile({ ...profile, debit_arrosage_mmh: v });
    }
    // ⚠️ localStorage conservé pour compatibilité ascendante 1 cycle.
    // À retirer dans une prochaine release.
    try { localStorage.setItem("mg360_debit_mmh", String(v)); } catch {}
    setDebitSaved(true);
    setTimeout(() => setDebitSaved(false), 2000);
  };

  // Panneaux dépliables : détail ou partage du score, réglage du débit, carte de parrainage
  const [panneauScore, setPanneauScore] = useState(null);
  const basculer = (panneau) => setPanneauScore(ouvert => ouvert === panneau ? null : panneau);
  const [debitOuvert, setDebitOuvert] = useState(false);
  const [parrainage, setParrainage]   = useState(false);

  const completion = calcCompletion(profile, isPaid, diagnostics);

  const month = new Date().getMonth() + 1;

  const { score, potential, label, color, issues, composantes } = calcLawnScore({ weather, profile, history, month, diagnostics });

  // ── Badges collectionnables (détection client, stockage profiles.data.badges) ──
  const streak = useStreak();
  const { badges: badgesList, nbUnlocked, total: badgesTotal, justUnlocked, clearJustUnlocked } =
    useBadges({ profile, saveProfile, score, diagnostics, streak, history, isPaid });

  const safeHistory = Array.isArray(history) ? history : [];

  // ── Score diff vs 7j ──
  const historyMinus7 = safeHistory.filter(h => {
    const parts = h.date?.split('/');
    if (!parts || parts.length !== 3) return true;
    const d = new Date(parts[2], parts[1]-1, parts[0]);
    return Math.floor((Date.now() - d.getTime()) / 86400000) >= 7;
  });
  const { score: scoreLastWeek } = calcLawnScore({ weather, profile, history: historyMinus7, month });
  const scoreDiff = score - scoreLastWeek;

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
          <button onClick={() => navigate("/parametres")} style={{ background:"rgba(102,187,106,0.12)", border:"1px solid rgba(102,187,106,0.3)", borderRadius:10, padding:"7px 12px", color:"#a5d6a7", fontSize:12, cursor:"pointer", fontWeight:700 }}>
            ⚙️ Paramètres
          </button>
        </div>
      </div>

      <div style={scroll}>

        {/* ── PROFIL À CONFIGURER (sans profil, le score reste approximatif) ── */}
        {!profile && (
          <div style={{ ...card(), textAlign:"center", padding:16 }}>
            <div style={{ fontSize:13, color:"#81c784", marginBottom:8 }}>Configurez votre profil pour un score précis</div>
            <button onClick={() => navigate("/setup")} style={{ background:"linear-gradient(135deg,#43a047,#2e7d32)", color:"#fff", border:"none", borderRadius:10, padding:"10px 24px", fontWeight:800, cursor:"pointer", fontSize:13 }}>🚀 Configurer mon gazon</button>
          </div>
        )}

        {/* ── SCORE SANTÉ (compact) : détail et partage dépliables ── */}
        <div data-tuile="mongazon-score" style={{ ...card(), padding:"12px 14px", background:"linear-gradient(135deg, rgba(27,94,32,0.5), rgba(13,43,26,0.7))", border:`1px solid ${color}55` }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <svg width="92" height="58" viewBox="0 0 160 100" role="img" aria-label={`Score santé : ${score} sur 100`} style={{ flexShrink:0 }}>
              <path d="M 15 90 A 65 65 0 0 1 145 90" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="14" strokeLinecap="round"/>
              <path d="M 15 90 A 65 65 0 0 1 145 90" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
                strokeDasharray={`${(score/100)*204} 204`}/>
              <text x="80" y="88" textAnchor="middle" fill="white" fontSize="44" fontWeight="bold" fontFamily="Nunito,Arial">{score}</text>
            </svg>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:10, color:"#66BB6A", fontWeight:700, letterSpacing:1.2 }}>🌿 SCORE SANTÉ</div>
              <div style={{ fontSize:16, fontWeight:800, color }}>{label}</div>
              <div style={{ fontSize:11, color:"#81c784", marginTop:2 }}>
                <span style={{ fontWeight:700, color: scoreDiff >= 0 ? "#66BB6A" : "#ef9a9a" }}>{scoreDiff >= 0 ? "📈 +" : "📉 "}{scoreDiff}</span> en 7 jours · potentiel <b style={{ color:"#f9a825" }}>{potential}</b>
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            <button data-tuile="mongazon-detail-score" onClick={() => basculer("detail")} aria-expanded={panneauScore === "detail"} style={petitBouton}>
              📊 Pourquoi ce score ? {panneauScore === "detail" ? "▲" : "▼"}
            </button>
            <button data-tuile="mongazon-partage-score" onClick={() => basculer("partage")} aria-expanded={panneauScore === "partage"} style={{ ...petitBouton, flex:"0 0 auto" }}>
              📤 Partager
            </button>
          </div>
          {panneauScore === "detail" && (
            <DetailScore composantes={composantes} issues={issues} isPaid={isPaid} sansHistorique={safeHistory.length === 0} onPremium={() => navigate("/subscribe")} />
          )}
          {panneauScore === "partage" && <PartageScore score={score} label={label} />}
        </div>

        {/* ── ÉVOLUTION DU SCORE ET ACTIONS DE L'ANNÉE, HISTORIQUE (ancienne page /history) ── */}
        <EvolutionScore weather={weather} profile={profile} history={history} diagnostics={diagnostics} />
        <HistoriqueActions history={history} removeEntry={removeEntry} />

        {/* ── MES PROGRÈS : série, GreenPoints, classement ; badges juste après ── */}
        <MesProgres />
        <BadgesGallery
          badges={badgesList}
          nbUnlocked={nbUnlocked}
          total={badgesTotal}
          justUnlocked={justUnlocked}
          clearJustUnlocked={clearJustUnlocked}
        />

        {/* ── MES OUTILS ── */}
        <div style={card()}>
          <div style={cardTitle}><span>🧰 Mes outils</span></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <Outil tuile="mongazon-plan-annuel" icone="📅" titre="Mon plan gazon" sous={isPaid ? "Les 12 mois, en PDF" : "Aperçu · inclus dans Premium"} onClick={() => navigate("/plan-annuel")} />
            <Outil tuile="mongazon-equipements" icone="📡" titre="Mes équipements" sous="Station, robot, arrosage" onClick={() => navigate("/equipements")} />
            <Outil tuile="mongazon-lancer-parcours" icone="🌱" titre="Semer ou regarnir" sous="Guidé étape par étape" onClick={() => navigate("/parcours")} />
            <Outil tuile="mongazon-produits" icone="🛒" titre="Produits et dépenses" sous="Kit de saison, budget" onClick={() => navigate("/products")} />
            <Outil tuile="mongazon-parrainage" icone="🎁" titre="Parraine tes amis" sous="1 mois de Premium offert à ton ami, puis à toi" onClick={() => setParrainage(ouvert => !ouvert)} large />
          </div>
        </div>
        {parrainage && <CarteParrainage />}

        {/* ── MON PROFIL : complétude, infos, débit de l'arroseur (Premium) ── */}
        {profile && (() => {
          const infos = [
            profile.objectif  ? { icon:"🎯", val: OBJECTIF_LABELS[profile.objectif] || profile.objectif } : null,
            profile.pelouse   ? { icon:"🌿", val: GAZON_LABELS[profile.pelouse] || profile.pelouse } : null,
            profile.surface   ? { icon:"📐", val: `${profile.surface} m²` } : null,
            profile.ville     ? { icon:"📍", val: profile.ville.split(",")[0] } : null,
            profile.sol && profile.sol !== "N/A" ? { icon:"🏔️", val: SOL_LABELS[profile.sol] || profile.sol } : null,
            profile.exposition ? { icon:"☀️", val: EXPO_LABELS[profile.exposition] || profile.exposition } : null,
            profile.arrosage && profile.arrosage !== "N/A" ? { icon:"💧", val: ARROSAGE_LABELS[profile.arrosage] || profile.arrosage } : null,
            profile.budget     ? { icon:"💰", val: profile.budget } : null,
          ].filter(Boolean);
          const manquants = [
            !profile.sol || profile.sol === "N/A" ? "Sol" : null,
            !profile.exposition ? "Exposition" : null,
            !profile.arrosage || profile.arrosage === "N/A" ? "Arrosage" : null,
          ].filter(Boolean);
          return (
            <div data-tuile="mongazon-profil" style={card()}>
              <div style={cardTitle}>
                <span>👤 Mon profil</span>
                <button onClick={() => navigate("/setup")} style={{ background: manquants.length ? "rgba(244,162,97,0.2)" : "rgba(76,175,80,0.2)", border:"none", borderRadius:8, padding:"4px 10px", color: manquants.length ? "#f4a261" : "#a5d6a7", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                  ✏️ {manquants.length ? "Compléter" : "Modifier"}
                </button>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <div style={{ flex:1, height:5, background:"rgba(255,255,255,0.08)", borderRadius:6, overflow:"hidden" }}>
                  <div style={{ width:`${completion}%`, height:"100%", borderRadius:6, background:"linear-gradient(90deg,#2d6a4f,#52b788)", transition:"width 0.6s" }} />
                </div>
                <span style={{ fontSize:11, fontWeight:800, color: completion >= 90 ? "#a5d6a7" : "#f4a261", whiteSpace:"nowrap" }}>Complété à {completion}%</span>
              </div>
              {infos.length > 0 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                  {infos.map(({ icon, val }) => (
                    <span key={val} style={{ background:"rgba(82,183,136,0.1)", border:"1px solid rgba(82,183,136,0.2)", borderRadius:20, padding:"3px 9px", fontSize:11, color:"#95d5b2" }}>{icon} {val}</span>
                  ))}
                </div>
              )}
              {manquants.length > 0 && (
                <div style={{ fontSize:11, color:"#f4a261", marginTop:8 }}>📋 À compléter : {manquants.join(", ")}</div>
              )}
              {manquants.length === 0 && completion < 100 && (
                <div style={{ fontSize:11, color:"#52b788", marginTop:8 }}>
                  ✅ {isPaid ? "Faites un diagnostic photo pour atteindre 100%" : "Passez Premium pour le diagnostic photo"}
                </div>
              )}
              {isPaid && (
                <div data-tuile="mongazon-debit-arroseur" style={{ marginTop:10, paddingTop:10, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                  <div role="button" tabIndex={0} aria-expanded={debitOuvert} onClick={() => setDebitOuvert(ouvert => !ouvert)} onKeyDown={auClavier(() => setDebitOuvert(ouvert => !ouvert))}
                    style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, cursor:"pointer" }}>
                    <span style={{ fontSize:12, color:"#e8f5e9" }}>💧 Débit de ton arroseur : <b style={{ color:"#64b5f6" }}>{debitMmH.toFixed(1)} mm/h</b></span>
                    <span style={{ fontSize:11, color:"#64b5f6", fontWeight:700, whiteSpace:"nowrap" }}>{debitOuvert ? "Fermer ▲" : "Régler ▼"}</span>
                  </div>
                  {debitOuvert && <ReglageDebit debitMmH={debitMmH} saveDebit={saveDebit} debitSaved={debitSaved} />}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── AVEC PREMIUM (comptes gratuits ; pas de carte d'achat dans l'app Android) ── */}
        {!isPaid && !subLoading && !isAndroidTWA() && <AvecPremium tuile="mongazon-avec-premium" />}

      </div>
    </div>
  );
}
