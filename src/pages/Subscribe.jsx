import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { appShell, btn, card } from "../lib/styles";
const PLANS = [
  { id:"monthly", label:"Mensuel", price:"4,99€", period:"/mois", desc:"Sans engagement", highlight:false },
  { id:"yearly", label:"Annuel", price:"39,99€", period:"/an", desc:"Économisez 20%", highlight:true },
];
const FEATURES_FREE = ["📅 Plan mensuel d'entretien","💧 Calcul d'arrosage de base","✅ Historique limité (5 entrées)","📍 Météo du jour"];
const FEATURES_PREMIUM = ["🤖 Recommandations IA personnalisées","📍 Météo temps réel + alertes","💧 Calcul d'arrosage intelligent","📅 Planning 7 jours adapté météo","✅ Historique illimité","⚠️ Alertes gel, canicule, orages","📱 Installable sur téléphone"];
export default function Subscribe() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [selected, setSelected] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleSubscribe = async () => {
    setLoading(true); setError("");
    try {
      const token = await getToken();
      const res = await fetch("/api/create-checkout", { method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`}, body: JSON.stringify({ plan:selected, email:user?.primaryEmailAddress?.emailAddress }) });
      if (!res.ok) throw new Error("Erreur serveur");
      const { url, error:apiError } = await res.json();
      if (apiError) throw new Error(apiError);
      if (url) window.location.href = url;
      else throw new Error("URL de paiement manquante");
    } catch(e) { setError("Erreur : " + e.message); }
    setLoading(false);
  };
  return (
    <div style={{...appShell,fontFamily:"'Nunito','Segoe UI',sans-serif",padding:"48px 20px 40px",overflowY:"auto"}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:48}}>🌿</div>
        <div style={{fontSize:22,fontWeight:800,color:"#a5d6a7",marginTop:8}}>Choisissez votre accès</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
        <div style={{...card(),border:"1px solid rgba(165,214,167,0.15)"}}>
          <div style={{fontSize:13,fontWeight:800,color:"#81c784",marginBottom:10}}>🆓 Gratuit</div>
          {FEATURES_FREE.map(f => (<div key={f} style={{fontSize:11,color:"#e8f5e9",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>{f}</div>))}
          <button onClick={() => navigate("/")} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:10,padding:"10px",color:"#e8f5e9",cursor:"pointer",fontSize:12,fontWeight:700,width:"100%",marginTop:12}}>Continuer gratuit</button>
        </div>
        <div style={{...card(),border:"1px solid rgba(76,175,80,0.4)",background:"rgba(76,175,80,0.1)"}}>
          <div style={{fontSize:13,fontWeight:800,color:"#a5d6a7",marginBottom:10}}>⭐ Premium</div>
          {FEATURES_PREMIUM.map(f => (<div key={f} style={{fontSize:11,color:"#e8f5e9",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>{f}</div>))}
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:16}}>
        {PLANS.map(p => (<button key={p.id} onClick={() => setSelected(p.id)} style={{flex:1,background:selected===p.id?"rgba(76,175,80,0.2)":"rgba(255,255,255,0.05)",border:`2px solid ${selected===p.id?"#43a047":"rgba(255,255,255,0.1)"}`,borderRadius:16,padding:"14px 8px",cursor:"pointer",color:"#e8f5e9",textAlign:"center",position:"relative"}}>{p.highlight && <div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:"#43a047",borderRadius:20,padding:"2px 10px",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>⭐ Populaire</div>}<div style={{fontWeight:800,fontSize:14,marginBottom:4}}>{p.label}</div><div style={{fontSize:20,fontWeight:800,color:"#a5d6a7"}}>{p.price}</div><div style={{fontSize:11,color:"#81c784"}}>{p.period}</div><div style={{fontSize:11,color:"#43a047",marginTop:4,fontWeight:600}}>{p.desc}</div></button>))}
      </div>
      {error && <div style={{background:"rgba(211,47,47,0.2)",border:"1px solid rgba(229,57,53,0.4)",borderRadius:12,padding:"12px 16px",marginBottom:12,fontSize:12,color:"#ef9a9a"}}>{error}</div>}
      <button onClick={handleSubscribe} disabled={loading} style={{...btn.primary,opacity:loading?0.7:1}}>{loading?"⌛ Redirection vers Stripe...":"💳 S'abonner maintenant"}</button>
      <div style={{textAlign:"center",fontSize:11,color:"#81c784",marginTop:10,opacity:0.7}}>Paiement sécurisé par Stripe · Résiliation en 1 clic</div>
    </div>
  );
}
