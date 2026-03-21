import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { card, btn } from "../lib/styles";

// Composant d'inscription avec consentements RGPD
// À intégrer dans le flux Clerk ou après la première connexion

export default function Register() {
  const navigate = useNavigate();
  const [consents, setConsents] = useState({
    cgu: false,
    confidentialite: false,
    notifications: false,
    dataResale: false,
    marketing: false,
  });
  const [error, setError] = useState("");

  const toggle = (key) => setConsents(p => ({ ...p, [key]: !p[key] }));

  const handleSubmit = () => {
    if (!consents.cgu || !consents.confidentialite) {
      setError("Vous devez accepter les CGU et la politique de confidentialité pour continuer.");
      return;
    }
    // Sauvegarder les consentements
    localStorage.setItem("gk_consents", JSON.stringify({
      ...consents,
      date: new Date().toISOString(),
      version: "1.0"
    }));
    navigate("/");
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg, #0d2b1a, #1a4731)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🌿</div>
      <div style={{ fontSize:22, fontWeight:800, color:"#a5d6a7", marginBottom:4 }}>Mon Gazon 360</div>
      <div style={{ fontSize:13, color:"#81c784", marginBottom:24 }}>Dernière étape avant de commencer !</div>

      <div style={{ width:"100%", maxWidth:420 }}>

        {/* CGU — OBLIGATOIRE */}
        <div style={{ ...card(), marginBottom:8, border: consents.cgu ? "1px solid #43a047" : "1px solid rgba(255,255,255,0.1)" }}>
          <label style={{ display:"flex", gap:12, alignItems:"flex-start", cursor:"pointer" }}>
            <input type="checkbox" checked={consents.cgu} onChange={() => toggle("cgu")}
              style={{ marginTop:3, width:18, height:18, cursor:"pointer" }} />
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#e8f5e9" }}>
                ✅ J'accepte les CGU <span style={{ color:"#ef9a9a" }}>*</span>
              </div>
              <div style={{ fontSize:11, color:"#81c784", marginTop:4, lineHeight:1.5 }}>
                J'ai lu et j'accepte les{" "}
                <span onClick={() => navigate("/cgu")} style={{ color:"#a5d6a7", textDecoration:"underline", cursor:"pointer" }}>
                  Conditions Générales d'Utilisation
                </span>{" "}et les{" "}
                <span onClick={() => navigate("/cgv")} style={{ color:"#a5d6a7", textDecoration:"underline", cursor:"pointer" }}>
                  CGV
                </span>
              </div>
            </div>
          </label>
        </div>

        {/* RGPD — OBLIGATOIRE */}
        <div style={{ ...card(), marginBottom:8, border: consents.confidentialite ? "1px solid #43a047" : "1px solid rgba(255,255,255,0.1)" }}>
          <label style={{ display:"flex", gap:12, alignItems:"flex-start", cursor:"pointer" }}>
            <input type="checkbox" checked={consents.confidentialite} onChange={() => toggle("confidentialite")}
              style={{ marginTop:3, width:18, height:18, cursor:"pointer" }} />
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#e8f5e9" }}>
                🔒 J'accepte la politique de confidentialité <span style={{ color:"#ef9a9a" }}>*</span>
              </div>
              <div style={{ fontSize:11, color:"#81c784", marginTop:4, lineHeight:1.5 }}>
                J'ai lu la{" "}
                <span onClick={() => navigate("/confidentialite")} style={{ color:"#a5d6a7", textDecoration:"underline", cursor:"pointer" }}>
                  Politique de confidentialité
                </span>{" "}
                et j'accepte le traitement de mes données pour la fourniture du service MG360.
              </div>
            </div>
          </label>
        </div>

        {/* NOTIFICATIONS — OPTIONNEL */}
        <div style={{ ...card(), marginBottom:8 }}>
          <label style={{ display:"flex", gap:12, alignItems:"flex-start", cursor:"pointer" }}>
            <input type="checkbox" checked={consents.notifications} onChange={() => toggle("notifications")}
              style={{ marginTop:3, width:18, height:18, cursor:"pointer" }} />
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#e8f5e9" }}>
                🔔 Activer les notifications push <span style={{ color:"#81c784", fontSize:11 }}>(optionnel)</span>
              </div>
              <div style={{ fontSize:11, color:"#81c784", marginTop:4, lineHeight:1.5 }}>
                Recevoir des alertes sur mon téléphone (gel, canicule, tonte en retard...) — max 1x/semaine.
              </div>
            </div>
          </label>
        </div>

        {/* DONNÉES — OPTIONNEL */}
        <div style={{ ...card(), marginBottom:8, background:"rgba(249,168,37,0.05)", border:"1px solid rgba(249,168,37,0.2)" }}>
          <label style={{ display:"flex", gap:12, alignItems:"flex-start", cursor:"pointer" }}>
            <input type="checkbox" checked={consents.dataResale} onChange={() => toggle("dataResale")}
              style={{ marginTop:3, width:18, height:18, cursor:"pointer" }} />
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#e8f5e9" }}>
                📊 Partager mes données anonymisées <span style={{ color:"#81c784", fontSize:11 }}>(optionnel)</span>
              </div>
              <div style={{ fontSize:11, color:"#81c784", marginTop:4, lineHeight:1.5 }}>
                J'accepte que MG360 partage mes données d'utilisation <strong>anonymisées</strong> (type de gazon, historique d'entretien, zone géographique approximative) avec des partenaires du secteur jardinage, à des fins d'études de marché.{" "}
                <strong style={{ color:"#f9a825" }}>Ces données ne contiennent jamais mon nom ni mon email.</strong>{" "}
                Je peux retirer ce consentement à tout moment dans Paramètres.
              </div>
            </div>
          </label>
        </div>

        {/* MARKETING — OPTIONNEL */}
        <div style={{ ...card(), marginBottom:16 }}>
          <label style={{ display:"flex", gap:12, alignItems:"flex-start", cursor:"pointer" }}>
            <input type="checkbox" checked={consents.marketing} onChange={() => toggle("marketing")}
              style={{ marginTop:3, width:18, height:18, cursor:"pointer" }} />
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#e8f5e9" }}>
                📧 Recevoir des emails MG360 <span style={{ color:"#81c784", fontSize:11 }}>(optionnel)</span>
              </div>
              <div style={{ fontSize:11, color:"#81c784", marginTop:4, lineHeight:1.5 }}>
                Conseils saisonniers, nouveautés, offres partenaires jardinage. Désabonnement possible à tout moment.
              </div>
            </div>
          </label>
        </div>

        {error && (
          <div style={{ background:"rgba(198,40,40,0.2)", border:"1px solid #c62828", borderRadius:10, padding:"10px 14px", fontSize:12, color:"#ef9a9a", marginBottom:12 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ fontSize:11, color:"#81c784", textAlign:"center", marginBottom:12 }}>
          <span style={{ color:"#ef9a9a" }}>*</span> Champs obligatoires
        </div>

        <button onClick={handleSubmit} style={{ ...btn.primary, fontSize:14, padding:"14px" }}>
          ✅ Commencer avec MG360
        </button>

        <div style={{ fontSize:10, color:"#4a7c5c", textAlign:"center", marginTop:12, lineHeight:1.5 }}>
          Vous pouvez modifier vos consentements à tout moment dans Paramètres → Mes données
        </div>
      </div>
    </div>
  );
}
