import { useNavigate } from "react-router-dom";
import { card, btn, scroll, header } from "../lib/styles";

export default function Diagnostic() {
  const navigate = useNavigate();
  return (
    <div>
      <div style={header}>
        <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>🔬 Diagnostic</div>
        <div style={{ fontSize:12, color:"#81c784", opacity:0.7, marginTop:4 }}>Analyse de l'état de votre gazon</div>
      </div>
      <div style={scroll}>
        <div style={{ ...card(), textAlign:"center", padding:40 }}>
          <div style={{ fontSize:52, marginBottom:16 }}>🔬</div>
          <div style={{ fontSize:16, fontWeight:800, color:"#a5d6a7", marginBottom:8 }}>Diagnostic Photo IA</div>
          <div style={{ fontSize:13, color:"#81c784", marginBottom:20, lineHeight:1.6 }}>
            Prenez une photo de votre gazon et notre IA analysera son état en temps réel — maladies, stress hydrique, carences...
          </div>
          <div style={{ background:"rgba(76,175,80,0.1)", border:"1px solid rgba(76,175,80,0.3)", borderRadius:14, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:13, color:"#f9a825", fontWeight:700 }}>🚧 En cours de développement</div>
            <div style={{ fontSize:12, color:"#81c784", marginTop:4 }}>Disponible dans la Phase 2</div>
          </div>
          <button onClick={() => navigate("/")} style={{ ...btn.ghost, width:"auto", padding:"10px 24px" }}>
            ← Retour Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
