import { useNavigate } from "react-router-dom";
import { appShell, btn } from "../lib/styles";

export default function SubscribeSuccess() {
  const navigate = useNavigate();
  return (
    <div style={{ ...appShell, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center" }}>
      <div style={{ fontSize:72, marginBottom:16 }}>🎉</div>
      <div style={{ fontSize:24, fontWeight:800, color:"#a5d6a7", marginBottom:8 }}>Bienvenue !</div>
      <div style={{ fontSize:14, color:"#81c784", lineHeight:1.7, marginBottom:32 }}>
        Votre abonnement est actif.<br/>
        Profitez de toutes les fonctionnalités GreenKeeper.
      </div>
      <button onClick={() => navigate("/")} style={{ ...btn.primary, width:"auto", padding:"14px 40px" }}>
        🌿 Commencer
      </button>
    </div>
  );
}
