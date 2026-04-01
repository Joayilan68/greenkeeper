// src/components/OnboardingModal.jsx
import { useState } from "react";

// ── Palette MG360 ─────────────────────────────────────────────────────────────
const C = {
  deepGreen:  "#2d6a4f",
  freshGreen: "#52b788",
  lightGreen: "#95d5b2",
  orange:     "#f4a261",
  bg:         "#0f2419",
  bgCard:     "rgba(255,255,255,0.05)",
  border:     "rgba(149,213,178,0.18)",
  borderSel:  "#52b788",
  text:       "#e8f5e9",
  textSoft:   "#95d5b2",
  textMuted:  "#4a7c5c",
};

const btn = {
  primary: {
    width: "100%", padding: "14px 20px", borderRadius: 14,
    background: `linear-gradient(135deg, ${C.deepGreen}, ${C.freshGreen})`,
    color: "#fff", fontWeight: 800, fontSize: 15, border: "none",
    cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.3,
    boxShadow: "0 4px 20px rgba(82,183,136,0.3)", transition: "all 0.2s",
  },
  ghost: {
    padding: "14px 20px", borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    color: C.textSoft, fontWeight: 700, fontSize: 14,
    border: `1px solid ${C.border}`, cursor: "pointer",
    fontFamily: "inherit", transition: "all 0.2s",
  },
};

// ── Data ──────────────────────────────────────────────────────────────────────
const OBJECTIFS = [
  { id: "parfait",     icon: "🏆", label: "Gazon parfait",            desc: "Dense, vert, impeccable" },
  { id: "fonctionnel", icon: "⚽", label: "Pelouse fonctionnelle",     desc: "Résistante, facile d'entretien" },
  { id: "naturel",     icon: "🌿", label: "Gazon naturel",             desc: "Écologique, peu d'entretien" },
  { id: "renover",     icon: "🔄", label: "Rénover ma pelouse",        desc: "Regarnir, ressemer, restaurer" },
  { id: "creer",       icon: "✨", label: "Créer une nouvelle pelouse", desc: "Partir de zéro" },
];

// Gazon standard (avec synthétique)
const GAZONS_STANDARD = [
  { id: "ray-grass",   icon: "🌱", label: "Ray-grass anglais (RGA)" },
  { id: "fetuque",     icon: "🌾", label: "Fétuque (rouge, élevée…)" },
  { id: "kikuyu",      icon: "🌿", label: "Kikuyu" },
  { id: "bermuda",     icon: "☀️", label: "Bermuda" },
  { id: "paturin",     icon: "🍀", label: "Pâturin des prés" },
  { id: "zoysia",      icon: "🌴", label: "Zoysia" },
  { id: "synthetique", icon: "🏟️", label: "Gazon synthétique" },
  { id: "mixte",       icon: "🤷", label: "Mélange / Je ne sais pas" },
];

// Gazon à créer (sans synthétique — on choisit ce qu'on plante)
const GAZONS_CREER = [
  { id: "ray-grass", icon: "🌱", label: "Ray-grass anglais (RGA)", desc: "Rapide, robuste, idéal tempéré" },
  { id: "fetuque",   icon: "🌾", label: "Fétuque",                  desc: "Résistant à la sécheresse" },
  { id: "paturin",   icon: "🍀", label: "Pâturin des prés",         desc: "Luxuriant, zones fraîches" },
  { id: "bermuda",   icon: "☀️", label: "Bermuda",                  desc: "Chaud, très résistant au piétinement" },
  { id: "zoysia",    icon: "🌴", label: "Zoysia",                   desc: "Méditerranéen, faible entretien" },
  { id: "kikuyu",    icon: "🌿", label: "Kikuyu",                   desc: "Croissance rapide, couvre-sol" },
  { id: "mixte",     icon: "🤷", label: "Je ne sais pas encore",    desc: "Ilan vous conseillera" },
];

const USAGES = [
  { id: "enfants", icon: "👶", label: "Enfants" },
  { id: "animaux", icon: "🐕", label: "Chiens / animaux" },
  { id: "sport",   icon: "⚽", label: "Sport / activité intense" },
  { id: "calme",   icon: "🪑", label: "Peu utilisée" },
];

const FEATURES = [
  { icon: "📅", title: "Planning intelligent",  desc: "Votre programme d'entretien personnalisé, semaine par semaine." },
  { icon: "🤖", title: "Ilan, votre IA gazon",  desc: "Posez toutes vos questions à votre expert pelouse disponible 24h/24." },
  { icon: "🌦️", title: "Météo en temps réel",   desc: "Conseils adaptés aux conditions climatiques de votre jardin." },
  { icon: "🏆", title: "GreenPoints & Ligues",  desc: "Gagnez des points, montez en ligue et restez motivé toute la saison." },
];

// ── Composants utilitaires ────────────────────────────────────────────────────
function ProgressBar({ step, total }) {
  return (
    <div style={{ display: "flex", gap: 5, marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 4, borderRadius: 4,
          background: i < step
            ? `linear-gradient(90deg, ${C.deepGreen}, ${C.freshGreen})`
            : "rgba(255,255,255,0.1)",
          transition: "background 0.4s",
        }} />
      ))}
    </div>
  );
}

function StepLabel({ current, total }) {
  return (
    <div style={{ textAlign: "right", fontSize: 11, color: C.textMuted, marginBottom: 6, fontWeight: 600 }}>
      {current} / {total}
    </div>
  );
}

function OptionCard({ selected, onClick, icon, label, desc, multi = false }) {
  return (
    <div onClick={onClick} style={{
      background: selected ? "rgba(82,183,136,0.18)" : C.bgCard,
      border: `1.5px solid ${selected ? C.borderSel : C.border}`,
      borderRadius: 14, padding: "12px 14px", cursor: "pointer",
      display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s",
    }}>
      <span style={{ fontSize: 22, minWidth: 30 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: selected ? C.lightGreen : C.text }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: C.textSoft, marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{
        width: 20, height: 20, borderRadius: multi ? 6 : "50%",
        border: `2px solid ${selected ? C.freshGreen : C.border}`,
        background: selected ? C.freshGreen : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.2s", flexShrink: 0,
      }}>
        {selected && <span style={{ fontSize: 11, color: "#fff", fontWeight: 900 }}>✓</span>}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 800, color: C.lightGreen, marginBottom: 10, letterSpacing: 0.2 }}>
      {children}
    </div>
  );
}

function InfoBanner({ color = "orange", children }) {
  const colors = {
    orange: { bg: "rgba(244,162,97,0.1)",   border: "rgba(244,162,97,0.3)",   text: "#f4c88a" },
    green:  { bg: "rgba(82,183,136,0.1)",   border: "rgba(82,183,136,0.3)",   text: C.lightGreen },
    blue:   { bg: "rgba(100,160,255,0.1)",  border: "rgba(100,160,255,0.3)",  text: "#a0c4ff" },
  };
  const s = colors[color];
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12,
      padding: "10px 14px", marginBottom: 16, fontSize: 12, color: s.text, lineHeight: 1.6,
    }}>
      {children}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function OnboardingModal({ onComplete }) {
  const TOTAL_STEPS = 6;

  const [step, setStep]               = useState(1);
  const [objectif, setObjectif]       = useState("");
  const [gazon, setGazon]             = useState("");
  const [surface, setSurface]         = useState("");
  const [surfaceErr, setSurfaceErr]   = useState("");
  const [locStatus, setLocStatus]     = useState("idle");
  const [locName, setLocName]         = useState("");
  const [locLat, setLocLat]           = useState(null);
  const [locLon, setLocLon]           = useState(null);
  const [manualCity, setManualCity]   = useState("");
  const [usages, setUsages]           = useState([]);
  const [featureSlide, setFeatureSlide] = useState(0);

  // ── Flags contextuels ─────────────────────────────────────────────────────
  const isSynthetique = gazon === "synthetique";
  const isCreer       = objectif === "creer";

  // ── Validations ───────────────────────────────────────────────────────────
  const canNext1      = objectif !== "";
  const canNext2      = gazon !== "";
  const locOk         = locStatus === "success" || manualCity.trim().length >= 2;
  const canNext3      = surface !== "" && !surfaceErr && locOk;
  const canNext4      = usages.length > 0;
  const isLastFeature = featureSlide === FEATURES.length - 1;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSurface = (v) => {
    setSurface(v);
    const n = parseInt(v);
    if (v && (isNaN(n) || n < 1 || n > 50000)) setSurfaceErr("Entre 1 et 50 000 m²");
    else setSurfaceErr("");
  };

  const toggleUsage = (id) =>
    setUsages(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]);

  // Reset gazon quand l'objectif change (évite gazon synthétique + objectif creer)
  const handleObjectif = (id) => {
    setObjectif(id);
    setGazon("");
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { setLocStatus("error"); return; }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocLat(latitude); setLocLon(longitude);
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "Votre région";
          setLocName(city); setManualCity(""); setLocStatus("success");
        } catch { setLocStatus("success"); }
      },
      () => setLocStatus("error"),
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleManualCity = (v) => {
    setManualCity(v);
    if (v.length > 0 && locStatus === "success") {
      setLocStatus("idle"); setLocName(""); setLocLat(null); setLocLon(null);
    }
  };

  const handleFinish = () => {
    const finalCity = locStatus === "success" ? locName : manualCity.trim();
    const profile = {
      objectif, pelouse: gazon, surface: parseInt(surface),
      ville: finalCity, lat: locLat, lon: locLon, usages,
      isSynthetique, isCreer,
      // Champs Phase 2 — à compléter dans "Mon Profil"
      // Sol et exposition supprimés pour synthétique, conservés pour les autres
      sol:        isSynthetique ? "N/A" : null,
      exposition: null,
      arrosage:   isSynthetique ? "N/A" : null,
      // Matériel : liste différente selon synthétique (Phase 2)
      tondeuse:   [],
      materiel:   [],
      budget:     null,
      profileCompletion: 40,
    };
    try {
      localStorage.setItem("mg360_profile_v1",      JSON.stringify(profile));
      localStorage.setItem("mg360_onboarding_done", "true");
      if (finalCity) localStorage.setItem("mg360_location_name", finalCity);
      if (locLat)    localStorage.setItem("mg360_lat", String(locLat));
      if (locLon)    localStorage.setItem("mg360_lon", String(locLon));
    } catch {}
    onComplete(profile);
  };

  const inputStyle = (hasError, isValid) => ({
    width: "100%", background: "rgba(255,255,255,0.07)",
    border: `1.5px solid ${hasError ? "#ef5350" : isValid ? C.freshGreen : C.border}`,
    borderRadius: 12, padding: "12px 16px", color: C.text,
    fontSize: 15, outline: "none", fontFamily: "inherit",
    boxSizing: "border-box", transition: "border-color 0.2s",
  });

  const gazonLabel = isSynthetique
    ? "Gazon synthétique"
    : isCreer
      ? `${GAZONS_CREER.find(g => g.id === gazon)?.label || gazon} (à créer)`
      : GAZONS_STANDARD.find(g => g.id === gazon)?.label || gazon;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.8)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div style={{
        width: "100%", maxWidth: 480,
        background: `linear-gradient(180deg, #1a3d2b 0%, ${C.bg} 100%)`,
        borderRadius: "24px 24px 0 0", padding: "20px 20px 44px",
        maxHeight: "94vh", overflowY: "auto",
      }}>
        <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.18)", borderRadius: 4, margin: "0 auto 20px" }} />
        <StepLabel current={step} total={TOTAL_STEPS} />
        <ProgressBar step={step} total={TOTAL_STEPS} />

        {/* ══ ÉTAPE 1 — Bienvenue + Objectif ══════════════════════════════ */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <img src="/icon-512x512.png" alt="Mongazon360" style={{ width: 80, height: 80, borderRadius: 20, objectFit: "cover", display: "block", margin: "0 auto 10px" }} />
              <div style={{ fontSize: 22, fontWeight: 900, color: C.lightGreen, marginBottom: 4 }}>Bienvenue sur Mongazon360 !</div>
              <div style={{ fontSize: 11, color: C.textMuted, fontStyle: "italic", marginBottom: 12 }}>Tant qu'il y a gazon, il y a match</div>
              <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.7 }}>
                6 étapes rapides pour personnaliser votre expérience et calculer votre score de santé pelouse.
              </div>
            </div>
            <SectionTitle>🎯 Quel est votre objectif principal ?</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
              {OBJECTIFS.map(o => (
                <OptionCard key={o.id} selected={objectif === o.id} onClick={() => handleObjectif(o.id)} icon={o.icon} label={o.label} desc={o.desc} />
              ))}
            </div>
            <button onClick={() => setStep(2)} disabled={!canNext1} style={{ ...btn.primary, opacity: canNext1 ? 1 : 0.4 }}>
              Continuer →
            </button>
          </div>
        )}

        {/* ══ ÉTAPE 2 — Type de gazon (adaptatif) ═════════════════════════ */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.lightGreen, marginBottom: 4 }}>
                {isCreer ? "🌱 Votre futur gazon" : "🌱 Type de gazon"}
              </div>
              <div style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.6 }}>
                {isCreer
                  ? "Quel type de gazon souhaitez-vous créer ? Ilan vous guidera selon votre sol et votre région."
                  : "Cette information est clé pour calibrer vos conseils d'entretien."}
              </div>
            </div>

            <SectionTitle>
              {isCreer ? "Quel gazon souhaitez-vous planter ?" : "Quel type de gazon avez-vous ?"}
            </SectionTitle>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {(isCreer ? GAZONS_CREER : GAZONS_STANDARD).map(g => (
                <OptionCard key={g.id} selected={gazon === g.id} onClick={() => setGazon(g.id)} icon={g.icon} label={g.label} desc={g.desc} />
              ))}
            </div>

            {isSynthetique && (
              <InfoBanner color="orange">
                🏟️ Pour le gazon synthétique, vos conseils porteront sur le nettoyage, le brossage, la désinfection et la gestion des odeurs. Les questions sur le sol, la tonte et l'arrosage ne s'appliqueront pas — votre profil Phase 2 sera adapté en conséquence.
              </InfoBanner>
            )}
            {isCreer && gazon && gazon !== "mixte" && (
              <InfoBanner color="green">
                ✨ Excellent choix ! Nous adapterons votre planning de création : préparation du sol, semis, premier arrosage et premières tontes.
              </InfoBanner>
            )}
            {isCreer && gazon === "mixte" && (
              <InfoBanner color="blue">
                💬 Pas de problème — Ilan analysera votre sol, votre région et votre usage pour vous recommander la variété idéale.
              </InfoBanner>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => setStep(1)} style={{ ...btn.ghost, flex: 1 }}>← Retour</button>
              <button onClick={() => setStep(3)} disabled={!canNext2} style={{ ...btn.primary, flex: 2, opacity: canNext2 ? 1 : 0.4 }}>
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* ══ ÉTAPE 3 — Surface + Localisation ════════════════════════════ */}
        {step === 3 && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.lightGreen, marginBottom: 4 }}>📍 Votre jardin</div>
              <div style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.6 }}>
                Surface et localisation pour des conseils météo adaptés à votre région.
              </div>
            </div>

            <SectionTitle>📐 Surface {isCreer ? "du terrain à aménager" : "de votre pelouse"} (m²)</SectionTitle>
            <input type="number" placeholder="Ex : 150" value={surface} onChange={e => handleSurface(e.target.value)} style={inputStyle(!!surfaceErr, surface && !surfaceErr)} />
            {surfaceErr
              ? <div style={{ color: "#ef9a9a", fontSize: 11, margin: "4px 0 12px" }}>{surfaceErr}</div>
              : surface && !surfaceErr
                ? <div style={{ color: C.freshGreen, fontSize: 11, margin: "4px 0 12px" }}>✓ {surface} m² enregistré</div>
                : <div style={{ height: 16, marginBottom: 12 }} />
            }

            <div style={{ height: 1, background: C.border, margin: "8px 0 20px" }} />
            <SectionTitle>🗺️ Localisation de votre jardin</SectionTitle>

            {locStatus === "idle" && (
              <button onClick={detectLocation} style={{ ...btn.primary, marginBottom: 12 }}>📍 Détecter ma position automatiquement</button>
            )}
            {locStatus === "loading" && (
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 16px", marginBottom: 12, textAlign: "center", fontSize: 13, color: C.textSoft }}>
                ⌛ Détection en cours...
              </div>
            )}
            {locStatus === "success" && (
              <div style={{ background: "rgba(82,183,136,0.15)", border: "1px solid rgba(82,183,136,0.4)", borderRadius: 12, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.lightGreen }}>Position détectée</div>
                    {locName && <div style={{ fontSize: 11, color: C.textSoft, marginTop: 2 }}>📍 {locName}</div>}
                  </div>
                </div>
                <button onClick={() => { setLocStatus("idle"); setLocName(""); setLocLat(null); setLocLon(null); }} style={{ background: "none", border: "none", color: C.textSoft, fontSize: 11, cursor: "pointer" }}>Modifier</button>
              </div>
            )}
            {locStatus === "error" && (
              <div style={{ background: "rgba(198,40,40,0.12)", border: "1px solid rgba(198,40,40,0.3)", borderRadius: 12, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 12, color: "#ef9a9a" }}>⚠️ Localisation refusée</div>
                <button onClick={detectLocation} style={{ background: "none", border: "none", color: C.textSoft, fontSize: 11, cursor: "pointer" }}>Réessayer</button>
              </div>
            )}

            {locStatus !== "success" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <span style={{ fontSize: 11, color: C.textMuted }}>ou saisir manuellement</span>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>
                <input type="text" placeholder="Votre ville (ex : Lyon, Bordeaux...)" value={manualCity} onChange={e => handleManualCity(e.target.value)} style={inputStyle(false, manualCity.trim().length >= 2)} />
                {manualCity.trim().length >= 2 && (
                  <div style={{ color: C.freshGreen, fontSize: 11, marginTop: 4 }}>✓ Ville enregistrée : {manualCity}</div>
                )}
              </>
            )}

            <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center", margin: "12px 0" }}>
              🔒 Utilisée uniquement pour la météo — jamais partagée
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => setStep(2)} style={{ ...btn.ghost, flex: 1 }}>← Retour</button>
              <button onClick={() => setStep(4)} disabled={!canNext3} style={{ ...btn.primary, flex: 2, opacity: canNext3 ? 1 : 0.4 }}>
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* ══ ÉTAPE 4 — Usage (multi-select, adaptatif) ════════════════════ */}
        {step === 4 && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.lightGreen, marginBottom: 4 }}>🏡 Usage de votre pelouse</div>
              <div style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.6 }}>
                Plusieurs choix possibles — cela adapte les recommandations de résistance et d'entretien.
              </div>
            </div>

            {isCreer && (
              <InfoBanner color="blue">
                ✨ L'usage prévu nous aide à choisir la variété et le niveau de résistance adaptés dès la création.
              </InfoBanner>
            )}
            {isSynthetique && (
              <InfoBanner color="orange">
                🏟️ L'usage détermine la fréquence de nettoyage, de désinfection et les produits recommandés pour votre gazon synthétique.
              </InfoBanner>
            )}

            <SectionTitle>
              {isCreer ? "Quel usage est prévu pour cette pelouse ?" : "Comment utilisez-vous votre pelouse ?"}
            </SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {USAGES.map(u => (
                <OptionCard key={u.id} selected={usages.includes(u.id)} onClick={() => toggleUsage(u.id)} icon={u.icon} label={u.label} multi={true} />
              ))}
            </div>

            {usages.length > 0 && (
              <div style={{ background: "rgba(82,183,136,0.08)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: C.textSoft }}>
                ✓ {usages.length} usage{usages.length > 1 ? "s" : ""} sélectionné{usages.length > 1 ? "s" : ""}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep(3)} style={{ ...btn.ghost, flex: 1 }}>← Retour</button>
              <button onClick={() => setStep(5)} disabled={!canNext4} style={{ ...btn.primary, flex: 2, opacity: canNext4 ? 1 : 0.4 }}>
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* ══ ÉTAPE 5 — Inscription Clerk + Résumé ════════════════════════ */}
        {step === 5 && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>🔐</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.lightGreen, marginBottom: 8 }}>Sauvegardez votre profil</div>
              <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.7 }}>
                Créez votre compte pour ne pas perdre vos données et accéder à votre tableau de bord depuis n'importe quel appareil.
              </div>
            </div>

            {/* Résumé adaptatif */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.lightGreen, marginBottom: 12 }}>📋 Votre profil en cours</div>
              {[
                ["🎯 Objectif",  OBJECTIFS.find(o => o.id === objectif)?.label || "—"],
                [isSynthetique ? "🏟️ Gazon" : isCreer ? "🌱 À créer" : "🌱 Gazon", gazonLabel],
                ["📐 Surface",   surface ? `${surface} m²` : "—"],
                ["📍 Ville",     locStatus === "success" ? locName : manualCity || "—"],
                ["🏡 Usage",     usages.length > 0 ? usages.map(u => USAGES.find(x => x.id === u)?.label).join(", ") : "—"],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 12 }}>
                  <span style={{ color: C.textSoft }}>{label}</span>
                  <span style={{ fontWeight: 700, color: C.text, maxWidth: "55%", textAlign: "right" }}>{val}</span>
                </div>
              ))}
            </div>

            {isSynthetique && (
              <InfoBanner color="orange">
                🏟️ Dans votre profil, vous pourrez renseigner votre équipement de nettoyage (brosse, souffleur, nettoyeur HP) pour des conseils encore plus précis.
              </InfoBanner>
            )}
            {isCreer && (
              <InfoBanner color="green">
                ✨ Votre profil de création inclura : type de sol, exposition, méthode de semis et planning d'implantation.
              </InfoBanner>
            )}

            {/* Barre de complétude */}
            <div style={{ background: "rgba(82,183,136,0.08)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
                <span style={{ color: C.textSoft, fontWeight: 700 }}>Complétude du profil</span>
                <span style={{ color: C.orange, fontWeight: 800 }}>40%</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 4 }}>
                <div style={{ width: "40%", height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${C.deepGreen}, ${C.freshGreen})`, transition: "width 0.6s" }} />
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8, lineHeight: 1.5 }}>
                🔓 Complétez votre profil jusqu'à 90% — le diagnostic photo Premium débloque les 10% restants.
              </div>
            </div>

            {/* Mount point Clerk */}
            <div id="clerk-onboarding-mount" style={{ marginBottom: 12 }}>
              {/* Brancher ici le composant Clerk SignUp */}
              <button onClick={() => setStep(6)} style={btn.primary}>
                🚀 Créer mon compte gratuitement
              </button>
            </div>

            <button onClick={() => setStep(4)} style={{ ...btn.ghost, width: "100%", marginTop: 8 }}>← Retour</button>
          </div>
        )}

        {/* ══ ÉTAPE 6 — Présentation des fonctionnalités ══════════════════ */}
        {step === 6 && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.lightGreen, marginBottom: 4 }}>🌟 Ce qui vous attend</div>
              <div style={{ fontSize: 12, color: C.textSoft }}>Fonctionnalité {featureSlide + 1} sur {FEATURES.length}</div>
            </div>

            <div style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.25)", borderRadius: 20, padding: "32px 24px", textAlign: "center", marginBottom: 24, minHeight: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>{FEATURES[featureSlide].icon}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: C.lightGreen, marginBottom: 10 }}>{FEATURES[featureSlide].title}</div>
              <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.7 }}>{FEATURES[featureSlide].desc}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 28 }}>
              {FEATURES.map((_, i) => (
                <div key={i} onClick={() => setFeatureSlide(i)} style={{ width: i === featureSlide ? 24 : 8, height: 8, borderRadius: 4, cursor: "pointer", background: i === featureSlide ? C.freshGreen : "rgba(255,255,255,0.15)", transition: "all 0.3s" }} />
              ))}
            </div>

            {isLastFeature ? (
              <button onClick={handleFinish} style={btn.primary}>🌿 Découvrir mon tableau de bord !</button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setFeatureSlide(f => Math.max(0, f - 1))} disabled={featureSlide === 0} style={{ ...btn.ghost, flex: 1, opacity: featureSlide === 0 ? 0.4 : 1 }}>←</button>
                <button onClick={() => setFeatureSlide(f => f + 1)} style={{ ...btn.primary, flex: 3 }}>Suivant →</button>
              </div>
            )}

            {!isLastFeature && (
              <button onClick={handleFinish} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 12, cursor: "pointer", width: "100%", marginTop: 14, fontFamily: "inherit" }}>
                Passer et accéder au dashboard →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
