import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useSubscription } from "../lib/useSubscription";
import { useHistory } from "../lib/useHistory";
import { useProfile } from "../lib/useProfile";
import { useWeather } from "../lib/useWeather";
import { card, cardTitle, btn, scroll, header } from "../lib/styles";

// Page Paramètres — Gestion données client + consentements
export default function Settings() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { isPaid, isAdmin } = useSubscription();
  const { history } = useHistory();
  const { profile } = useProfile();
  const { locationName } = useWeather() || {};
  const [consents, setConsents] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("gk_consents");
    if (saved) setConsents(JSON.parse(saved));
  }, []);

  const updateConsent = (key, value) => {
    const updated = { ...consents, [key]: value, lastUpdated: new Date().toISOString() };
    setConsents(updated);
    localStorage.setItem("gk_consents", JSON.stringify(updated));
  };

  const exportData = () => {
    const data = {
      user: { email: user?.emailAddresses[0]?.emailAddress, name: user?.fullName },
      profile,
      history,
      consents,
      location: locationName,
      subscription: isPaid ? "Premium" : "Gratuit",
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "mes-donnees-mg360.json"; a.click();
  };

  const deleteAllData = () => {
    ["gk_location","gk_location_name","gk_profile","gk_history","gk_consents","gk_push_sub","gk_admin_code"].forEach(k => localStorage.removeItem(k));
    setDeleted(true);
  };

  if (deleted) return (
    <div style={{ minHeight:"100vh", background:"#0d2b1a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20, color:"#a5d6a7" }}>
      <div style={{ fontSize:48 }}>✅</div>
      <div style={{ fontSize:18, fontWeight:800, marginTop:12 }}>Données supprimées</div>
      <div style={{ fontSize:13, color:"#81c784", marginTop:8 }}>Toutes vos données locales ont été effacées.</div>
      <button onClick={() => navigate("/")} style={{ ...btn.primary, marginTop:20, width:"auto", padding:"10px 24px" }}>Retour à l'accueil</button>
    </div>
  );

  return (
    <div>
      <div style={header}>
        <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>⚙️ Mes données & Paramètres</div>
        <div style={{ fontSize:12, color:"#81c784", opacity:0.7, marginTop:4 }}>RGPD — Gestion de vos consentements</div>
      </div>

      <div style={scroll}>

        {/* RÉSUMÉ DONNÉES */}
        <div style={card()}>
          <div style={cardTitle}><span>👤 Mes données</span></div>
          {[
            { label:"Email", val: user?.emailAddresses[0]?.emailAddress || "—" },
            { label:"Abonnement", val: isPaid ? "✅ Premium" : "🆓 Gratuit" },
            { label:"Interventions", val: `${history?.length || 0} entrées` },
            { label:"Profil gazon", val: profile ? `${profile.pelouse} — ${profile.surface}m²` : "Non configuré" },
            { label:"Localisation", val: locationName || "Non définie" },
          ].map(({ label, val }) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:13 }}>
              <span style={{ color:"#81c784" }}>{label}</span>
              <span style={{ fontWeight:600 }}>{val}</span>
            </div>
          ))}
          <button onClick={exportData} style={{ ...btn.ghost, marginTop:12, fontSize:12, padding:"8px" }}>
            📥 Télécharger mes données (RGPD)
          </button>
        </div>

        {/* CONSENTEMENTS */}
        <div style={card()}>
          <div style={cardTitle}><span>🔒 Mes consentements</span></div>
          <div style={{ fontSize:11, color:"#81c784", marginBottom:12 }}>
            Modifiez vos préférences à tout moment — effet immédiat
          </div>

          {[
            { key:"notifications", label:"🔔 Notifications push", desc:"Alertes téléphone (max 1x/semaine)", required:false },
            { key:"dataResale", label:"📊 Données anonymisées partagées", desc:"Études de marché jardinage — jamais votre nom/email", required:false },
            { key:"marketing", label:"📧 Emails MG360", desc:"Conseils saisonniers et nouveautés", required:false },
          ].map(({ key, label, desc, required }) => (
            <div key={key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600 }}>{label}</div>
                <div style={{ fontSize:11, color:"#81c784" }}>{desc}</div>
              </div>
              {required ? (
                <span style={{ fontSize:11, color:"#43a047" }}>Obligatoire</span>
              ) : (
                <div onClick={() => updateConsent(key, !consents[key])} style={{
                  width:44, height:24, borderRadius:12, cursor:"pointer",
                  background: consents[key] ? "#43a047" : "rgba(255,255,255,0.1)",
                  position:"relative", transition:"background 0.2s"
                }}>
                  <div style={{
                    position:"absolute", top:3, left: consents[key] ? 22 : 3,
                    width:18, height:18, borderRadius:"50%", background:"#fff",
                    transition:"left 0.2s"
                  }} />
                </div>
              )}
            </div>
          ))}

          {consents.lastUpdated && (
            <div style={{ fontSize:10, color:"#4a7c5c", marginTop:8 }}>
              Dernière mise à jour : {new Date(consents.lastUpdated).toLocaleDateString("fr-FR")}
            </div>
          )}
        </div>

        {/* LIENS LÉGAUX */}
        <div style={card()}>
          <div style={cardTitle}><span>📋 Documents légaux</span></div>
          {[
            { label:"Mentions légales", route:"/mentions-legales" },
            { label:"Politique de confidentialité", route:"/confidentialite" },
            { label:"CGU", route:"/cgu" },
            { label:"CGV", route:"/cgv" },
            { label:"Politique de cookies", route:"/cookies" },
          ].map(({ label, route }) => (
            <div key={route} onClick={() => navigate(route)} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", cursor:"pointer", fontSize:13 }}>
              <span>{label}</span>
              <span style={{ color:"#81c784" }}>→</span>
            </div>
          ))}
        </div>

        {/* CONTACT RÉCLAMATION */}
        <div style={{ ...card(), background:"rgba(33,150,243,0.08)", border:"1px solid rgba(33,150,243,0.25)" }}>
          <div style={cardTitle}><span>📞 Contact & Réclamations</span></div>
          <div style={{ fontSize:13, color:"#e8f5e9", lineHeight:1.7 }}>
            Pour toute réclamation ou exercice de vos droits RGPD :<br/>
            <strong style={{ color:"#a5d6a7" }}>contact@mongazon360.fr</strong><br/>
            Réponse sous 48h — Résolution sous 10 jours ouvrés<br/>
            Médiateur : mediateur.net
          </div>
        </div>

        {/* SUPPRESSION COMPTE */}
        <div style={{ ...card(), background:"rgba(198,40,40,0.08)", border:"1px solid rgba(198,40,40,0.25)" }}>
          <div style={cardTitle}><span>🗑️ Supprimer mes données</span></div>
          <div style={{ fontSize:12, color:"#81c784", marginBottom:12, lineHeight:1.5 }}>
            Conformément au RGPD, vous pouvez supprimer toutes vos données locales. 
            Pour la suppression complète de votre compte, contactez contact@mongazon360.fr
          </div>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} style={{ background:"rgba(198,40,40,0.2)", border:"1px solid #c62828", borderRadius:10, padding:"10px", color:"#ef9a9a", fontSize:13, cursor:"pointer", width:"100%", fontWeight:700 }}>
              🗑️ Supprimer mes données locales
            </button>
          ) : (
            <div>
              <div style={{ fontSize:13, color:"#ef9a9a", marginBottom:12, fontWeight:700 }}>
                ⚠️ Cette action est irréversible. Toutes vos données locales seront supprimées.
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={deleteAllData} style={{ background:"#c62828", border:"none", borderRadius:10, padding:"10px", color:"#fff", fontSize:13, cursor:"pointer", flex:1, fontWeight:700 }}>
                  Confirmer la suppression
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} style={{ ...btn.ghost, flex:1, fontSize:13 }}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
