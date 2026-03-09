import { useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { appShell, btn, card } from "../lib/styles";

const PLANS = [
  { id: "monthly", label: "Mensuel", price: "4,99€", period: "/mois", desc: "Sans engagement", highlight: false },
  { id: "yearly",  label: "Annuel",  price: "39,99€", period: "/an", desc: "Économisez 20%", highlight: true },
];

export default function Subscribe() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [selected, setSelected] = useState("monthly");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: selected, email: user?.primaryEmailAddress?.emailAddress }),
      });
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      alert("Erreur lors de la redirection vers le paiement.");
    }
    setLoading(false);
  };

  return (
    <div style={{ ...appShell, display: "flex", flexDirection: "column", padding: "48px 20px 32px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48 }}>🌿</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#a5d6a7", marginTop: 8 }}>Accès Premium</div>
        <div style={{ fontSize: 13, color: "#81c784", marginTop: 6, lineHeight: 1.6 }}>
          Recommandations IA · Météo temps réel<br/>Planning hebdomadaire · Historique illimité
        </div>
      </div>

      {/* Features */}
      <div style={{ ...card(), marginBottom: 20 }}>
        {["🤖 Recommandations IA personnalisées chaque jour",
          "📍 Météo en temps réel selon votre localisation",
          "💧 Calcul d'arrosage intelligent",
          "⚠️ Alertes gel, canicule, orages",
          "📅 Planning 7 jours adapté",
          "📋 Historique de toutes vos interventions",
          "📱 Installable sur téléphone (PWA)"].map(f => (
          <div key={f} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:13 }}>
            <span style={{ color:"#43a047" }}>✓</span> {f}
          </div>
        ))}
      </div>

      {/* Plan selector */}
      <div style={{ display:"flex", gap:10, marginBottom:20 }}>
        {PLANS.map(p => (
          <button key={p.id} onClick={() => setSelected(p.id)} style={{
            flex:1, background: selected===p.id ? "rgba(76,175,80,0.2)" : "rgba(255,255,255,0.05)",
            border: `2px solid ${selected===p.id ? "#43a047" : "rgba(255,255,255,0.1)"}`,
            borderRadius:16, padding:"16px 8px", cursor:"pointer", color:"#e8f5e9", textAlign:"center", position:"relative",
          }}>
            {p.highlight && <div style={{ position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)", background:"#43a047", borderRadius:20, padding:"2px 10px", fontSize:10, fontWeight:700, whiteSpace:"nowrap" }}>⭐ Populaire</div>}
            <div style={{ fontWeight:800, fontSize:15, marginBottom:4 }}>{p.label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:"#a5d6a7" }}>{p.price}</div>
            <div style={{ fontSize:11, color:"#81c784" }}>{p.period}</div>
            <div style={{ fontSize:11, color:"#43a047", marginTop:4, fontWeight:600 }}>{p.desc}</div>
          </button>
        ))}
      </div>

      <button onClick={handleSubscribe} disabled={loading} style={{ ...btn.primary, opacity: loading ? 0.7 : 1 }}>
        {loading ? "⌛ Redirection..." : "🚀 Commencer l'abonnement"}
      </button>
      <div style={{ textAlign:"center", fontSize:11, color:"#81c784", marginTop:12, opacity:0.7 }}>
        Paiement sécurisé par Stripe · Résiliation en 1 clic
      </div>
    </div>
  );
}
