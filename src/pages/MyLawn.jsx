import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useProfile } from "../lib/useProfile";
import { useHistory } from "../lib/useHistory";
import { useWeather } from "../lib/useWeather";
import { useSubscription } from "../lib/useSubscription";
import { useConsents } from "../lib/useConsents";
import { useReminders } from "../lib/useReminders";
import { useRecommandations } from "../lib/useRecommandations";
import { calcLawnScore } from "../lib/lawnScore";
import { useDiagnostics } from "../lib/useDiagnostics";
import { MONTHLY_PLAN, MONTHS_FR, calcArrosage, DEBIT_DEFAULT_MMH, getDebitMmH } from "../lib/lawn";
import { buildActions, zoneClimatique, ZONE_LABELS } from "../lib/planEntretien";
import { card, cardTitle, btn, scroll, header } from "../lib/styles";
import ProductCard from "../components/ProductCard";

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

// ── Fréquences agronomiques fixes (Knowledge Base v4) ─────────────────────────
// Ces valeurs sont définitives — l'utilisateur ne les choisit pas.
const REMINDER_TYPES = [
  {
    id: "tonte",
    icon: "✂️",
    label: "Tonte",
    // Fréquence dynamique selon saison (calculée à l'affichage)
    getFrequence: (month) => {
      if (month >= 5 && month <= 8) return "tous les 4-5 jours (été)";
      if (month >= 3 && month <= 10) return "tous les 5-7 jours (printemps/automne)";
      return "pause hivernale";
    },
  },
  {
    id: "arrosage",
    icon: "💧",
    label: "Arrosage",
    getFrequence: () => "selon météo et sol",
  },
  {
    id: "engrais",
    icon: "🌱",
    label: "Engrais",
    getFrequence: () => "délai min. 45 jours entre applications",
  },
  {
    id: "fongicide",
    icon: "💊",
    label: "Traitement fongicide",
    getFrequence: () => "si conditions à risque détectées",
  },
  {
    id: "aeration",
    icon: "🌀",
    label: "Aération",
    getFrequence: () => "1-2 fois/an (délai min. 90 jours)",
  },
  {
    id: "desherbage",
    icon: "🪴",
    label: "Désherbage",
    getFrequence: () => "délai min. 21 jours entre traitements",
  },
];

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

function ShareScore({ score, label, profile }) {
  const [copied, setCopied]       = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const appUrl         = "https://mongazon360.fr";
  const emoji          = score >= 85 ? "🏆" : score >= 70 ? "😊" : score >= 55 ? "😐" : score >= 40 ? "😟" : "😰";
  const gazon          = profile?.pelouse ? ` Mon ${profile.pelouse}` : " Mon gazon";
  const surface        = profile?.surface ? ` (${profile.surface}m²)` : "";
  const message        = `${emoji} Mon gazon a un score santé de ${score}/100 sur Mongazon360™ !\n🌿 "${label}"\n\nSuivez votre gazon en temps réel :\n${appUrl}`;
  const messageEncoded = encodeURIComponent(message);
  const urlEncoded     = encodeURIComponent(appUrl);
  const SHARE_OPTIONS  = [
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
  const navigate                  = useNavigate();
  const { profile, saveProfile }  = useProfile();
  const { history = [] }          = useHistory();
  const { weather }               = useWeather() || {};
  const { isPaid = false }        = useSubscription() || {};
  const { user }                  = useUser();
  const { syncFromReminders }     = useConsents();
  const { reminders, toggle, activeCount, syncToServer } = useReminders(syncFromReminders);

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

  // ── État complétion profil ──────────────────────────────────────────────
  const [p2, setP2] = useState({
    sol:        profile?.sol        || null,
    exposition: profile?.exposition || null,
    arrosage:   profile?.arrosage   || null,
    tondeuse:   profile?.tondeuse   || [],
    materiel:   profile?.materiel   || [],
    budget:     profile?.budget     || null,
  });

  const completion = calcCompletion(profile, isPaid, diagnostics);

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
    updated.profileCompletion = calcCompletion(updated, isPaid, diagnostics);
    saveProfile(updated);
  };

  const month = new Date().getMonth() + 1;
  const plan  = MONTHLY_PLAN[month];
  const { score, potential, label, color, issues, strengths, composantes } = calcLawnScore({ weather, profile, history, month, diagnostics });

  // ── Conseil du mois ──
  const { diagnostics } = useDiagnostics();
  const { recommandationPrincipale } = useRecommandations(profile, score, weather, history);

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
          <button onClick={() => navigate("/parametres")} style={{ background:"rgba(102,187,106,0.12)", border:"1px solid rgba(102,187,106,0.3)", borderRadius:10, padding:"7px 12px", color:"#66BB6A", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
            ⚙️ Paramètres
          </button>
        </div>
      </div>

      <div style={scroll}>

        {/* ── MON PROFIL ────────────────────────────────────────────────── */}
        {profile ? (
          <div style={card()}>
            <div style={cardTitle}>
              <span>👤 Mon profil</span>
              <button onClick={() => navigate("/setup")} style={{ background:"rgba(76,175,80,0.2)", border:"none", borderRadius:8, padding:"4px 10px", color:"#a5d6a7", fontSize:11, cursor:"pointer" }}>
                ✏️ Modifier
              </button>
            </div>
            {/* Barre complétude */}
            <div style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:4 }}>
                <span style={{ color:"#81c784", fontWeight:700 }}>Complétude du profil</span>
                <span style={{ color: completion >= 90 ? "#a5d6a7" : "#f4a261", fontWeight:800 }}>{completion}%</span>
              </div>
              <div style={{ height:6, background:"rgba(255,255,255,0.08)", borderRadius:6, overflow:"hidden" }}>
                <div style={{ width:`${completion}%`, height:"100%", borderRadius:6, background:"linear-gradient(90deg,#2d6a4f,#52b788)", transition:"width 0.6s" }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"#4a7c5c", marginTop:2 }}>
                <span>Onboarding ✅</span><span>Profil 90%</span><span>📸 Premium 100%</span>
              </div>
            </div>
            {/* Infos profil */}
            {(() => {
              const OBJECTIF_LABELS = { parfait:"Gazon parfait", fonctionnel:"Pelouse fonctionnelle", naturel:"Gazon naturel", renover:"Rénover ma pelouse", creer:"Créer une nouvelle pelouse" };
              const SOL_LABELS      = { argileux:"Argileux", limoneux:"Limoneux", sableux:"Sableux", calcaire:"Calcaire", humifere:"Humifère", compacte:"Compacté", inconnu:"Non défini" };
              const EXPO_LABELS     = { ensoleille:"Ensoleillé", "mi-ombre":"Mi-ombre", ombrage:"Ombragé" };
              const ARROSAGE_LABELS = { automatique:"Arrosage auto", manuel:"Tuyau/manuel", aucun:"Pas d'arrosage", rarement:"Rarement" };
              const GAZON_LABELS    = { sport:"Sport", ombre:"Ombre / mi-ombre", sec:"Sec / méditerranéen", ornemental:"Ornemental", universel:"Universel", chaud:"Gazon chaud", inconnu:"Non défini" };
              const phase1 = [
                profile.objectif  ? { icon:"🎯", val: OBJECTIF_LABELS[profile.objectif] || profile.objectif } : null,
                profile.pelouse   ? { icon:"🌿", val: GAZON_LABELS[profile.pelouse] || profile.pelouse } : null,
                profile.surface   ? { icon:"📐", val: `${profile.surface} m²` } : null,
                profile.ville     ? { icon:"📍", val: profile.ville.split(",")[0] } : null,
              ].filter(Boolean);
              const phase2 = [
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
                <>
                  {phase1.length > 0 && (
                    <div style={{ marginBottom:8 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:"#4a7c5c", letterSpacing:1, marginBottom:5 }}>PROFIL DE BASE</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                        {phase1.map(({ icon, val }) => (
                          <span key={val} style={{ background:"rgba(82,183,136,0.1)", border:"1px solid rgba(82,183,136,0.2)", borderRadius:20, padding:"3px 9px", fontSize:11, color:"#95d5b2" }}>{icon} {val}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {phase2.length > 0 && (
                    <div style={{ marginBottom:8 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:"#4a7c5c", letterSpacing:1, marginBottom:5 }}>PROFIL DÉTAILLÉ</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                        {phase2.map(({ icon, val }) => (
                          <span key={val} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(149,213,178,0.18)", borderRadius:20, padding:"3px 9px", fontSize:11, color:"#e8f5e9" }}>{icon} {val}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {manquants.length > 0 && (
                    isPaid ? (
                      <div style={{ background:"rgba(244,162,97,0.08)", border:"1px solid rgba(244,162,97,0.25)", borderRadius:10, padding:"8px 12px" }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"#f4a261", marginBottom:4 }}>📋 À compléter : {manquants.join(", ")}</div>
                        <button onClick={() => navigate("/setup")} style={{ width:"100%", background:"rgba(244,162,97,0.2)", color:"#f4a261", border:"1px solid rgba(244,162,97,0.3)", borderRadius:8, padding:"6px", fontSize:11, fontWeight:700, cursor:"pointer" }}>Compléter → +{manquants.length * 8}%</button>
                      </div>
                    ) : (
                      <button onClick={() => navigate("/setup")} style={{ width:"100%", background:"rgba(249,168,37,0.1)", color:"#f9a825", border:"1px solid rgba(249,168,37,0.25)", borderRadius:8, padding:"6px", fontSize:11, fontWeight:700, cursor:"pointer" }}>Compléter mon profil →</button>
                    )
                  )}
                  {manquants.length === 0 && completion < 100 && (
                    <div style={{ fontSize:11, color:"#52b788", textAlign:"center", padding:"4px 0" }}>
                      ✅ {isPaid ? "Faites un diagnostic photo pour atteindre 100%" : "Passez Premium pour le diagnostic photo"}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          <div style={{ ...card(), textAlign:"center", padding:16 }}>
            <div style={{ fontSize:13, color:"#81c784", marginBottom:8 }}>Configurez votre profil pour un score précis</div>
            <button onClick={() => navigate("/setup")} style={{ background:"linear-gradient(135deg,#43a047,#2e7d32)", color:"#fff", border:"none", borderRadius:10, padding:"10px 24px", fontWeight:800, cursor:"pointer", fontSize:13 }}>🚀 Configurer mon gazon</button>
          </div>
        )}

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
            <div style={{ position:"relative" }}>
              <svg width="160" height="100" viewBox="0 0 160 100">
                <path d="M 15 90 A 65 65 0 0 1 145 90" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" strokeLinecap="round"/>
                <path d="M 15 90 A 65 65 0 0 1 145 90" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={`${(score/100)*204} 204`}/>
                <text x="80" y="82" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold" fontFamily="Nunito,Arial">{score}</text>
                <text x="80" y="95" textAnchor="middle" fill={color} fontSize="11" fontFamily="Nunito,Arial">/100 — {label}</text>
              </svg>
            </div>
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

        {/* ── 3. DÉTAIL DU SCORE — version contextuelle texte ──
            Pas de chiffres internes exposés à l'utilisateur.
            Pas de distinction Free/Premium — c'est de la lisibilité, pas de la valeur ajoutée.
        ── */}
        {(() => {
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
            return safeHistory.length === 0
              ? "Commencez à journaliser vos actions pour améliorer ce score"
              : "Tonte ou arrosage en retard — consultez le plan du mois";
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
            return safeHistory.length === 0
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
            <div style={card()}>
              <div style={cardTitle}><span>📊 Détail du score</span></div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {items.map((item) => {
                  const statut = getStatut(item.val);
                  return (
                    <div key={item.label} style={{ background:statut.bg, border:`1px solid ${statut.border}`, borderRadius:12, padding:"10px 14px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:"#e8f5e9" }}>
                          {item.icon} {item.label}
                        </span>
                        <span style={{ fontSize:11, fontWeight:800, color:statut.color, background:statut.bg, border:`1px solid ${statut.border}`, borderRadius:20, padding:"2px 10px" }}>
                          {statut.label}
                        </span>
                      </div>
                      <div style={{ fontSize:11, color:"#81c784", lineHeight:1.5 }}>
                        {item.ctx}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── 4. PROBLÈMES PRIORITAIRES ── */}
        {issues.length > 0 && (
          <div style={card()}>
            <div style={cardTitle}><span>⚠️ Problèmes prioritaires</span></div>
            {(isPaid ? issues : issues.slice(0,2)).map((issue, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 10px", background:"rgba(239,108,0,0.1)", borderRadius:10, marginBottom:6, border:"1px solid rgba(239,108,0,0.2)" }}>
                <span style={{ fontSize:13 }}>{issue.icon} {issue.label}</span>
                <span style={{ fontSize:12, fontWeight:700, color:"#ef9a9a" }}>{issue.impact} pts</span>
              </div>
            ))}
            {!isPaid && issues.length > 2 && (
              <div style={{ fontSize:12, color:"#f9a825", textAlign:"center", marginTop:6 }}>
                🔒 +{issues.length - 2} problème{issues.length-2>1?"s":""} masqué{issues.length-2>1?"s":""} — <span style={{ cursor:"pointer", textDecoration:"underline" }} onClick={() => navigate("/subscribe")}>Premium</span>
              </div>
            )}
          </div>
        )}

        {/* ── 5. PLAN DU MOIS ──────────────────────────────────────────────────
            Logique : affiche ce qui est agronomiquement prévu ce mois.
            horsS = calculé mais non affiché (usage interne dev uniquement).
            Optimisé smartphone : lignes haute densité, touch targets ≥44px.
        ── */}
        {(() => {
          const _arrosPlanRaw = profile && weather
            ? calcArrosage(month, profile, weather, history, getDebitMmH())
            : null;
          const arrosPlan = (_arrosPlanRaw && !_arrosPlanRaw.skip) ? _arrosPlanRaw : null;
          const zone    = zoneClimatique(profile);
          const statuts = buildActions(profile, weather, history, score, month, _arrosPlanRaw);

          // horsS conservé côté code pour usage interne — non affiché à l'utilisateur
          const recommandes = statuts.filter(a => a.status === "recommended" || a.status === "done_today" || a.status === "too_soon");
          const bloques     = statuts.filter(a => a.status === "blocked" || a.status === "exclusive");

          const countAFaire = recommandes.filter(a => a.status === "recommended").length;

          // Icône par action id — adapté aux Tabler icons (emoji fallback si inconnu)
          const iconFor = (id) => {
            const map = {
              tonte:          "✂️",
              arrosage:       "💧",
              engrais_starter:"🌱",
              engrais_ete:    "☀️",
              engrais_automne:"🍂",
              engrais_hiver:  "❄️",
              verticut:       "🔧",
              aeration:       "🌀",
              scarification:  "🔩",
              desherbage:     "🪴",
              antimousse:     "💊",
              biostimulant:   "🌿",
              regarnissage:   "🌾",
            };
            return map[id] || "📋";
          };

          // Raison blocage lisible
          const raisonCourte = (status, blockedReason, exclusiveWith, daysLeft) => {
            if (status === "too_soon")  return `Disponible dans ${daysLeft}j`;
            if (status === "exclusive") return `Attendre après ${exclusiveWith}`;
            if (blockedReason)          return blockedReason;
            return "Conditions non réunies";
          };

          return (
            <div style={card()}>

              {/* ── Header ── */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:"#F1F8F2" }}>
                    📅 Plan {MONTHS_FR[month]}
                  </div>
                  <div style={{ fontSize:11, color:"#66BB6A", marginTop:2 }}>
                    {plan?.label} · {ZONE_LABELS[zone] || zone}
                  </div>
                </div>
                {countAFaire > 0 && (
                  <span style={{
                    fontSize:11, fontWeight:800,
                    background:"rgba(102,187,106,0.2)",
                    color:"#66BB6A",
                    border:"1px solid rgba(102,187,106,0.35)",
                    borderRadius:20, padding:"3px 10px",
                    whiteSpace:"nowrap",
                  }}>
                    {countAFaire} à faire
                  </span>
                )}
              </div>

              {/* ── À faire / Fait / Bientôt ── */}
              {recommandes.length > 0 && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:10, fontWeight:800, color:"#4a7c5c", letterSpacing:1, marginBottom:8 }}>
                    À FAIRE CE MOIS
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {recommandes.map(({ action, status, daysLeft }) => {
                      const detail = action.detail?.(plan, arrosPlan, profile, month, zone);
                      const isDone   = status === "done_today";
                      const isSoon   = status === "too_soon";
                      const borderColor = isDone ? "#4ade80" : isSoon ? "#fbbf24" : "#66BB6A";
                      return (
                        <div key={action.id} style={{
                          display:"flex", alignItems:"center", gap:12,
                          padding:"11px 12px",
                          background:"rgba(255,255,255,0.04)",
                          borderRadius:12,
                          borderLeft:`3px solid ${borderColor}`,
                          minHeight:44, // touch target
                        }}>
                          <span style={{ fontSize:20, flexShrink:0, lineHeight:1 }}>{iconFor(action.id)}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:700, color: isDone ? "#4ade80" : "#e8f5e9", lineHeight:1.3 }}>
                              {action.label.replace(/[✂️💧🌱☀️🍂❄️🔧🌀🔩🪴💊🌿🌾]/gu, "").trim()}
                              {isDone && <span style={{ fontSize:11, color:"#4ade80", marginLeft:6 }}>✓ Fait aujourd'hui</span>}
                              {isSoon  && <span style={{ fontSize:11, color:"#fbbf24", marginLeft:6 }}>Dans {daysLeft}j</span>}
                            </div>
                            {detail && (
                              <div style={{ fontSize:11, color:"#81c784", marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                                {detail}
                              </div>
                            )}
                          </div>
                          {/* Lien produit — bouton discret, pas de ProductCard inline */}
                          {action.needsProduct && status === "recommended" && ACTION_TO_AMAZON[action.id] && (
                            <button
                              onClick={() => navigate("/products")}
                              style={{
                                flexShrink:0,
                                background:"rgba(249,168,37,0.15)",
                                border:"1px solid rgba(249,168,37,0.35)",
                                borderRadius:20,
                                padding:"5px 10px",
                                color:"#f9a825",
                                fontSize:11,
                                fontWeight:700,
                                cursor:"pointer",
                                whiteSpace:"nowrap",
                              }}
                            >
                              🛒 Voir
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Bloqués ── */}
              {bloques.length > 0 && (
                <div>
                  <div style={{ fontSize:10, fontWeight:800, color:"#4a7c5c", letterSpacing:1, marginBottom:8 }}>
                    BLOQUÉS AUJOURD'HUI
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                    {bloques.map(({ action, status, blockedReason, exclusiveWith, daysLeft }) => (
                      <div key={action.id} style={{
                        display:"flex", alignItems:"center", gap:12,
                        padding:"9px 12px",
                        background:"rgba(255,255,255,0.02)",
                        borderRadius:10,
                        border:"1px solid rgba(255,255,255,0.06)",
                        opacity:0.75,
                        minHeight:44,
                      }}>
                        <span style={{ fontSize:18, flexShrink:0, lineHeight:1 }}>{iconFor(action.id)}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, color:"#81c784", fontWeight:600 }}>
                            {action.label.replace(/[✂️💧🌱☀️🍂❄️🔧🌀🔩🪴💊🌿🌾]/gu, "").trim()}
                          </div>
                          <div style={{ fontSize:11, color:"#ef9a9a", marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {raisonCourte(status, blockedReason, exclusiveWith, daysLeft)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Aucune action ce mois */}
              {recommandes.length === 0 && bloques.length === 0 && (
                <div style={{ textAlign:"center", padding:"16px 0", color:"#4a7c5c", fontSize:13 }}>
                  ✅ Aucune intervention prévue ce mois
                </div>
              )}

            </div>
          );
        })()}

        {/* ── 6. RAPPELS D'ENTRETIEN ──────────────────────────────────────────
            Fréquences fixes calquées sur la Knowledge Base v4.
            L'utilisateur active/désactive — il ne choisit pas la fréquence.
        ── */}
        {isPaid && (
          <div style={card()}>
            <div style={cardTitle}>
              <span>🔔 Rappels d'entretien</span>
              <span style={{ fontSize:11, color:"#66BB6A" }}>{activeCount} actif{activeCount > 1 ? "s" : ""}</span>
            </div>
            <div style={{ fontSize:12, color:"#81c784", marginBottom:12, lineHeight:1.5 }}>
              Activez les rappels souhaités. Les alertes sont envoyées chaque matin à 8h selon le calendrier agronomique de votre gazon.
            </div>

            {REMINDER_TYPES.map(type => {
              const r        = reminders[type.id] || {};
              const isActive = !!r.enabled;
              const syncReminders = () => {
                if (!user?.id) return;
                const consents = JSON.parse(localStorage.getItem("mg360_consents") || "{}");
                syncToServer(user.id, user.primaryEmailAddress?.emailAddress, consents);
              };
              return (
                <div key={type.id} style={{ borderBottom:"1px solid rgba(255,255,255,0.05)", paddingBottom:12, marginBottom:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:22, minWidth:28 }}>{type.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color: isActive ? "#F1F8F2" : "#81c784" }}>
                        {type.label}
                      </div>
                      <div style={{ fontSize:11, color:"#4a7c5c", marginTop:2 }}>
                        {type.getFrequence(month)}
                      </div>
                    </div>
                    <div
                      onClick={() => { toggle(type.id); syncReminders(); }}
                      style={{ width:40, height:22, borderRadius:11, cursor:"pointer", background: isActive ? "#66BB6A" : "rgba(255,255,255,0.15)", position:"relative", transition:"background 0.3s", flexShrink:0 }}
                    >
                      <div style={{ width:16, height:16, borderRadius:"50%", background:"#fff", position:"absolute", top:3, left: isActive ? 21 : 3, transition:"left 0.3s" }} />
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{ fontSize:11, color:"#f9a825", marginTop:4, padding:"8px 10px", background:"rgba(249,168,37,0.1)", border:"1px solid rgba(249,168,37,0.3)", borderRadius:8, lineHeight:1.5 }}>
              ⚠️ Pour recevoir les notifications et rappels, activez Push et Emails dans{" "}
              <span onClick={() => navigate("/parametres")} style={{ color:"#66BB6A", cursor:"pointer", textDecoration:"underline", fontWeight:700 }}>Paramètres</span>
            </div>
          </div>
        )}

        {/* ── 7. CALIBRAGE ARROSEUR ── */}
        <div style={{ ...card(), background:"linear-gradient(135deg,rgba(25,118,210,0.1),rgba(13,43,26,0.6))", border:"1px solid rgba(100,181,246,0.3)" }}>
          <div style={cardTitle}>
            <span>💧 Calibrage arroseur</span>
            {!isPaid && <span style={{ fontSize:10, color:"#f9a825", background:"rgba(249,168,37,0.15)", borderRadius:20, padding:"2px 8px" }}>🔒 Premium</span>}
          </div>
          {isPaid ? (
            <div>
              <div style={{ fontSize:12, color:"#81c784", marginBottom:14, lineHeight:1.6 }}>
                Renseignez le débit de votre arroseur pour obtenir des durées d'arrosage précises. La durée s'ajuste automatiquement dans "Aujourd'hui".
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:16 }}>
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
          ) : (
            <div style={{ padding:"4px 0" }}>
              <div style={{ fontSize:13, color:"#81c784", lineHeight:1.7, marginBottom:14 }}>
                Calibrez la durée d'arrosage selon votre matériel et obtenez des recommandations au plus précis.
              </div>
              <div style={{ display:"flex", gap:8, flexDirection:"column", marginBottom:16 }}>
                {["⏱️ Durée calculée selon votre arroseur réel","🎯 Arroseur oscillant, rotatif, enrouleur, micro-asperseur","💡 Économies d'eau grâce à l'arrosage optimisé"].map(f => (
                  <div key={f} style={{ fontSize:12, color:"#81c784" }}>✓ {f}</div>
                ))}
              </div>
              <button onClick={() => navigate("/subscribe")} style={{ background:"linear-gradient(135deg,#F59E0B,#D97706)", color:"#1a1a1a", fontWeight:800, border:"none", borderRadius:10, cursor:"pointer", fontSize:13, padding:"12px", width:"100%" }}>
                ⭐ Passer Premium — 4,99€/mois
              </button>
            </div>
          )}
        </div>

        {/* ── 8. PRODUITS RECOMMANDÉS ── */}
        {(() => {
          const _arrosProdRaw = profile && weather ? calcArrosage(month, profile, weather, history, getDebitMmH()) : null;
          const arrosProd = (_arrosProdRaw && !_arrosProdRaw.skip) ? _arrosProdRaw : null;
          const allStatuts = buildActions(profile, weather, history, score, month, _arrosProdRaw);


          const actionKeys = allStatuts
            .filter(a => a.status === "recommended" && a.action.needsProduct && ACTION_TO_AMAZON[a.action.id])
            .map(a => ACTION_TO_AMAZON[a.action.id]);

          const ISSUE_TO_AMAZON = {
            mousse:           "antiMousse",
            fertilite:        month <= 4 || month === 12 ? "engraisStarter" : month <= 8 ? "engraisEte" : "engraisAutomne",
            nutriments:       month <= 4 || month === 12 ? "engraisStarter" : month <= 8 ? "engraisEte" : "engraisAutomne",
            mauvaises_herbes: "desherbage",
            sol_compacte:     "aeration",
            thatch:           "verticut",
            stress_hydrique:  "biostimulant",
          };
          const issueKeys = issues.map(i => ISSUE_TO_AMAZON[i.id] || null).filter(Boolean);
          const allKeys = [...new Set([...actionKeys, ...issueKeys])];
          const keysToShow = isPaid ? allKeys.slice(0, 3) : allKeys.slice(0, 1);

          return (
            <div style={card()}>
              <div style={cardTitle}><span>🛒 Produits recommandés</span></div>
              <div style={{ fontSize:11, color:"#81c784", marginBottom:12, fontStyle:"italic", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span>{actionKeys.length > 0 ? "Liés aux actions prioritaires du mois" : "Sélectionnés selon votre score"}</span>
                {isPaid && <span style={{ fontSize:10, color:"#66BB6A", background:"rgba(102,187,106,0.1)", border:"1px solid rgba(102,187,106,0.2)", borderRadius:20, padding:"2px 8px", fontStyle:"normal", fontWeight:700 }}>⭐ Personnalisés Premium</span>}
              </div>
              {keysToShow.length > 0 ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {profile && keysToShow.map(key => (
                    <ProductCard key={key} actionKey={key} profile={profile} compact />
                  ))}
                </div>
              ) : (
                <div style={{ fontSize:12, color:"#81c784", textAlign:"center", padding:"12px 0" }}>
                  ✅ Aucun produit nécessaire pour le moment — votre gazon est en bonne santé !
                </div>
              )}
              {!isPaid && allKeys.length > 1 && (
                <div style={{ fontSize:12, color:"#f9a825", textAlign:"center", marginTop:10 }}>
                  🔒 +{allKeys.length - 1} produit{allKeys.length - 1 > 1 ? "s" : ""} masqué{allKeys.length - 1 > 1 ? "s" : ""} —{" "}
                  <span style={{ cursor:"pointer", textDecoration:"underline" }} onClick={() => navigate("/subscribe")}>Premium</span>
                </div>
              )}
              <button onClick={() => navigate("/products")} style={{ ...btn.primary, marginTop:12, fontSize:12, padding:"8px" }}>Voir tous les produits →</button>
            </div>
          );
        })()}

        {/* ── 9. BLOC PREMIUM ── */}
        {!isPaid && (
          <div style={{ ...card(), background:"linear-gradient(135deg, rgba(249,168,37,0.15), rgba(230,81,0,0.1))", border:"1px solid rgba(249,168,37,0.4)", textAlign:"center" }}>
            <div style={{ fontSize:28, marginBottom:8 }}>⭐</div>
            <div style={{ fontSize:15, fontWeight:800, color:"#f9a825", marginBottom:8 }}>Passez Premium</div>
            {["Détail complet du score","Arrosage précis calculé","Produits personnalisés","Rappels push + email"].map(f => (
              <div key={f} style={{ fontSize:12, color:"#e8f5e9", padding:"3px 0" }}>✔ {f}</div>
            ))}
            <button onClick={() => navigate("/subscribe")} style={{ background:"linear-gradient(135deg,#F59E0B,#D97706)", color:"#1a1a1a", fontWeight:800, border:"none", borderRadius:10, cursor:"pointer", marginTop:14, padding:"12px 28px", fontSize:14 }}>
              ⭐ Améliorer mon gazon — 4,99€/mois
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
