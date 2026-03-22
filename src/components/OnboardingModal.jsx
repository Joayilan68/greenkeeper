// src/components/OnboardingModal.jsx
import { useState } from "react";
import { btn } from "../lib/styles";

const OBJECTIFS = [
  { id:"beau",        icon:"🏆", label:"Gazon parfait",        desc:"Dense, vert, impeccable" },
  { id:"fonctionnel", icon:"⚽", label:"Pelouse fonctionnelle", desc:"Résistante, facile d'entretien" },
  { id:"naturel",     icon:"🌿", label:"Gazon naturel",         desc:"Écologique, peu d'entretien" },
  { id:"renouveler",  icon:"🔄", label:"Rénover ma pelouse",    desc:"Regarnir, ressemer, restaurer" },
];

const GAZONS = [
  { id:"ray-grass",  label:"Ray-grass anglais",   icon:"🌱" },
  { id:"fetuque",    label:"Fétuque",              icon:"🌾" },
  { id:"kikuyu",     label:"Kikuyu",               icon:"🌿" },
  { id:"bermuda",    label:"Bermuda",              icon:"☀️" },
  { id:"mixte",      label:"Mélange / Je sais pas", icon:"🤷" },
];

const SOLS = [
  { id:"argileux", label:"Argileux",    icon:"🏔️", desc:"Lourd, se compacte" },
  { id:"sableux",  label:"Sableux",     icon:"🏖️", desc:"Léger, sèche vite" },
  { id:"limoneux", label:"Limoneux",    icon:"🌍", desc:"Équilibré, fertile" },
  { id:"calcaire", label:"Calcaire",    icon:"🪨", desc:"Caillouteux, pH élevé" },
  { id:"inconnu",  label:"Je sais pas", icon:"🤷", desc:"On s'en occupe !" },
];

function ProgressBar({ step, total }) {
  return (
    <div style={{ display:"flex", gap:6, marginBottom:24 }}>
      {Array.from({ length:total }).map((_, i) => (
        <div key={i} style={{ flex:1, height:4, borderRadius:4, background: i < step ? "#43a047" : "rgba(255,255,255,0.15)", transition:"background 0.3s" }} />
      ))}
    </div>
  );
}

function OptionCard({ selected, onClick, icon, label, desc }) {
  return (
    <div onClick={onClick} style={{
      background: selected ? "rgba(67,160,71,0.25)" : "rgba(255,255,255,0.05)",
      border: `1px solid ${selected ? "#43a047" : "rgba(255,255,255,0.12)"}`,
      borderRadius:14, padding:"12px 14px", cursor:"pointer",
      display:"flex", alignItems:"center", gap:12, transition:"all 0.2s",
    }}>
      <span style={{ fontSize:24, minWidth:32 }}>{icon}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:700, color: selected ? "#a5d6a7" : "#e8f5e9" }}>{label}</div>
        {desc && <div style={{ fontSize:11, color:"#81c784", marginTop:2 }}>{desc}</div>}
      </div>
      {selected && <span style={{ color:"#43a047", fontSize:18 }}>✓</span>}
    </div>
  );
}

export default function OnboardingModal({ onComplete }) {
  const [step, setStep]             = useState(1);
  const [objectif, setObjectif]     = useState("");
  const [gazon, setGazon]           = useState("");
  const [sol, setSol]               = useState("");
  const [surface, setSurface]       = useState("");
  const [surfaceErr, setSurfaceErr] = useState("");
  const [locStatus, setLocStatus]   = useState("idle"); // idle | loading | success | error
  const [locName, setLocName]       = useState("");

  const canNext1 = objectif !== "";
  const canNext2 = gazon !== "" && sol !== "" && surface !== "" && !surfaceErr;

  const handleSurface = (v) => {
    setSurface(v);
    const n = parseInt(v);
    if (v && (isNaN(n) || n < 1 || n > 50000)) setSurfaceErr("Entre 1 et 50 000 m²");
    else setSurfaceErr("");
  };

  // ── Géolocalisation ────────────────────────────────────────────────────────
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocStatus("error");
      return;
    }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Sauvegarde les coordonnées pour useWeather
        try {
          localStorage.setItem("gk_lat",  String(latitude));
          localStorage.setItem("gk_lon",  String(longitude));
          // Géocodage inverse pour afficher le nom de la ville
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "Votre région";
          localStorage.setItem("gk_location_name", city);
          setLocName(city);
          setLocStatus("success");
        } catch {
          setLocStatus("success"); // coords sauvegardées même sans géocodage
        }
      },
      () => {
        setLocStatus("error");
      },
      { timeout:10000, enableHighAccuracy:false }
    );
  };

  // ── Finalisation ───────────────────────────────────────────────────────────
  const handleFinish = () => {
    const profile = {
      pelouse:  gazon,
      sol,
      surface:  parseInt(surface),
      objectif,
    };
    // Sauvegarde profil avec la même clé que useProfile
    try {
      localStorage.setItem("gk_profile_v1",      JSON.stringify(profile));
      localStorage.setItem("gk_onboarding_done", "true");
    } catch {}
    onComplete(profile);
  };

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(0,0,0,0.75)",
      display:"flex", alignItems:"flex-end", justifyContent:"center",
    }}>
      <div style={{
        width:"100%", maxWidth:480,
        background:"linear-gradient(180deg,#1a3d2b 0%,#0d2b1a 100%)",
        borderRadius:"24px 24px 0 0",
        padding:"28px 20px 40px",
        maxHeight:"92vh", overflowY:"auto",
      }}>
        {/* Poignée */}
        <div style={{ width:40, height:4, background:"rgba(255,255,255,0.2)", borderRadius:4, margin:"0 auto 24px" }} />

        <ProgressBar step={step} total={3} />

        {/* ── ÉTAPE 1 — Bienvenue + Objectif ──────────────────────────────── */}
        {step === 1 && (
          <div>
            <div style={{ textAlign:"center", marginBottom:24 }}>
              <div style={{ fontSize:48, marginBottom:10 }}>🌿</div>
              <div style={{ fontSize:22, fontWeight:800, color:"#a5d6a7", marginBottom:4 }}>
                Bienvenue sur Mon Gazon 360 !
              </div>
              <div style={{ fontSize:11, color:"#4a7c5c", fontStyle:"italic", marginBottom:10 }}>
                Tant qu'il y a gazon, il y a match
              </div>
              <div style={{ fontSize:13, color:"#81c784", lineHeight:1.6 }}>
                3 questions rapides pour personnaliser votre expérience et calculer votre score de santé.
              </div>
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:"#a5d6a7", marginBottom:10 }}>
              🎯 Quel est votre objectif principal ?
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:24 }}>
              {OBJECTIFS.map(o => (
                <OptionCard key={o.id} selected={objectif===o.id} onClick={() => setObjectif(o.id)}
                  icon={o.icon} label={o.label} desc={o.desc} />
              ))}
            </div>
            <button onClick={() => setStep(2)} disabled={!canNext1}
              style={{ ...btn.primary, opacity:canNext1?1:0.4, fontSize:15, padding:"14px" }}>
              Continuer →
            </button>
          </div>
        )}

        {/* ── ÉTAPE 2 — Gazon + Sol + Surface ─────────────────────────────── */}
        {step === 2 && (
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7", marginBottom:4 }}>🌱 Votre gazon</div>
            <div style={{ fontSize:12, color:"#81c784", marginBottom:20 }}>Ces infos permettent des conseils ultra-personnalisés.</div>

            <div style={{ fontSize:13, fontWeight:700, color:"#a5d6a7", marginBottom:8 }}>Type de gazon</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:18 }}>
              {GAZONS.map(g => (
                <OptionCard key={g.id} selected={gazon===g.id} onClick={() => setGazon(g.id)}
                  icon={g.icon} label={g.label} />
              ))}
            </div>

            <div style={{ fontSize:13, fontWeight:700, color:"#a5d6a7", marginBottom:8 }}>Type de sol</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:18 }}>
              {SOLS.map(s => (
                <OptionCard key={s.id} selected={sol===s.id} onClick={() => setSol(s.id)}
                  icon={s.icon} label={s.label} desc={s.desc} />
              ))}
            </div>

            <div style={{ fontSize:13, fontWeight:700, color:"#a5d6a7", marginBottom:8 }}>Surface (m²)</div>
            <input
              type="number" placeholder="Ex : 150" value={surface}
              onChange={e => handleSurface(e.target.value)}
              style={{
                width:"100%", background:"rgba(255,255,255,0.08)",
                border:`1px solid ${surfaceErr ? "#ef5350" : "rgba(165,214,167,0.3)"}`,
                borderRadius:12, padding:"12px 16px", color:"#e8f5e9",
                fontSize:16, outline:"none", fontFamily:"inherit",
                boxSizing:"border-box", marginBottom:4,
              }}
            />
            {surfaceErr && <div style={{ color:"#ef9a9a", fontSize:11, marginBottom:8 }}>{surfaceErr}</div>}

            <div style={{ display:"flex", gap:8, marginTop:20 }}>
              <button onClick={() => setStep(1)} style={{ ...btn.ghost, flex:1, fontSize:13 }}>← Retour</button>
              <button onClick={() => setStep(3)} disabled={!canNext2}
                style={{ ...btn.primary, flex:2, opacity:canNext2?1:0.4, fontSize:14, padding:"14px" }}>
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 — Localisation + Résumé ─────────────────────────────── */}
        {step === 3 && (
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7", marginBottom:4 }}>📍 Localisation</div>
            <div style={{ fontSize:12, color:"#81c784", marginBottom:16 }}>
              Utilisée pour la météo locale et les conseils saisonniers adaptés à votre région.
            </div>

            {/* Bouton localisation */}
            {locStatus === "idle" && (
              <button onClick={detectLocation} style={{ ...btn.primary, marginBottom:8, fontSize:14, padding:"14px" }}>
                📍 Autoriser ma localisation
              </button>
            )}
            {locStatus === "loading" && (
              <div style={{ ...btn.primary, marginBottom:8, fontSize:14, padding:"14px", textAlign:"center", opacity:0.7 }}>
                ⌛ Détection en cours...
              </div>
            )}
            {locStatus === "success" && (
              <div style={{ background:"rgba(67,160,71,0.2)", border:"1px solid rgba(67,160,71,0.4)", borderRadius:12, padding:"12px 16px", marginBottom:8, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:20 }}>✅</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#a5d6a7" }}>Localisation détectée !</div>
                  {locName && <div style={{ fontSize:11, color:"#81c784", marginTop:2 }}>📍 {locName}</div>}
                </div>
              </div>
            )}
            {locStatus === "error" && (
              <div style={{ background:"rgba(198,40,40,0.15)", border:"1px solid rgba(198,40,40,0.3)", borderRadius:12, padding:"12px 16px", marginBottom:8 }}>
                <div style={{ fontSize:12, color:"#ef9a9a", marginBottom:6 }}>
                  ⚠️ Localisation refusée — vous pourrez l'activer plus tard dans les paramètres.
                </div>
                <button onClick={detectLocation} style={{ ...btn.ghost, fontSize:12, padding:"6px 12px" }}>
                  Réessayer
                </button>
              </div>
            )}

            <div style={{ fontSize:11, color:"#4a7c5c", textAlign:"center", marginBottom:20 }}>
              Utilisée uniquement pour la météo — jamais partagée
            </div>

            {/* Résumé profil */}
            <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(165,214,167,0.2)", borderRadius:16, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#a5d6a7", marginBottom:12 }}>✅ Votre profil Mon Gazon 360</div>
              {[
                ["🎯 Objectif", OBJECTIFS.find(o=>o.id===objectif)?.label || objectif],
                ["🌱 Gazon",    GAZONS.find(g=>g.id===gazon)?.label || gazon],
                ["🏔️ Sol",      SOLS.find(s=>s.id===sol)?.label || sol],
                ["📐 Surface",  `${surface} m²`],
                ["📍 Lieu",     locName || (locStatus==="success" ? "Détecté" : "Non renseigné")],
              ].map(([label, val]) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:12 }}>
                  <span style={{ color:"#81c784" }}>{label}</span>
                  <span style={{ fontWeight:700 }}>{val}</span>
                </div>
              ))}
            </div>

            <div style={{ background:"rgba(67,160,71,0.1)", border:"1px solid rgba(67,160,71,0.25)", borderRadius:12, padding:"12px 14px", marginBottom:20, fontSize:12, color:"#a5d6a7", lineHeight:1.6 }}>
              🌿 Votre score de santé sera calculé en temps réel grâce à ces informations, la météo locale et votre historique d'entretien.
            </div>

            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setStep(2)} style={{ ...btn.ghost, flex:1, fontSize:13 }}>← Retour</button>
              <button onClick={handleFinish} style={{ ...btn.primary, flex:2, fontSize:15, padding:"14px" }}>
                🚀 Démarrer Mon Gazon 360 !
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
