import { useNavigate } from "react-router-dom";
import { appShell, btn } from "../lib/styles";

// ════════════════════════════════════════════════════════════════════════════
// SUBSCRIBE SUCCESS — Page de confirmation après paiement Stripe réussi
// URL : /subscribe/success (cf. success_url dans api/create-checkout.js)
// ════════════════════════════════════════════════════════════════════════════

export default function SubscribeSuccess() {
  const navigate = useNavigate();

  return (
    <div style={{ ...appShell, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center" }}>
      <div style={{ fontSize:72, marginBottom:16 }}>🎉</div>

      <div style={{ fontSize:24, fontWeight:800, color:"#a5d6a7", marginBottom:8 }}>
        Bienvenue dans Mongazon360<sup style={{ fontSize:12 }}>™</sup> Premium !
      </div>

      <div style={{ fontSize:14, color:"#81c784", lineHeight:1.7, marginBottom:24, maxWidth:380 }}>
        Votre abonnement est actif.<br/>
        Profitez dès maintenant de toutes les fonctionnalités Premium :
      </div>

      {/* Liste des bénéfices Premium */}
      <div style={{ background:"rgba(76,175,80,0.08)", border:"1px solid rgba(76,175,80,0.25)", borderRadius:14, padding:"14px 18px", marginBottom:28, textAlign:"left", maxWidth:380, width:"100%" }}>
        {[
          "🤖 Recommandations IA personnalisées",
          "📍 Météo temps réel + alertes",
          "💧 Calcul d'arrosage intelligent",
          "📅 Planning 7 jours adapté météo",
          "✅ Historique illimité",
          "⚠️ Alertes gel, canicule, orages",
        ].map(f => (
          <div key={f} style={{ fontSize:13, color:"#e8f5e9", padding:"5px 0" }}>{f}</div>
        ))}
      </div>

      <button onClick={() => navigate("/")} style={{ ...btn.primary, width:"auto", padding:"14px 40px" }}>
        🌿 Commencer
      </button>

      {/* Rappel résiliation */}
      <div style={{ fontSize:11, color:"#81c784", marginTop:16, opacity:0.8, lineHeight:1.6 }}>
        Vous pouvez gérer ou résilier votre abonnement<br/>
        à tout moment depuis vos Paramètres.
      </div>

      {/* Mention marque déposée EUIPO */}
      <div style={{ fontSize:9, color:"#3a5c44", marginTop:32, lineHeight:1.6 }}>
        © {new Date().getFullYear()} Mongazon360<sup style={{ fontSize:7 }}>™</sup> — Marque déposée à l'EUIPO
      </div>
    </div>
  );
}
