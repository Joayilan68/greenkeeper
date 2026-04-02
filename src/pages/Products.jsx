import { useNavigate } from "react-router-dom";
import { useSubscription } from "../lib/useSubscription";
import { card, btn, scroll, header } from "../lib/styles";

const PRODUCTS = [
  { id:1, name:"Engrais NPK 15-5-10", desc:"Printemps/été · Croissance active", price:"24,90€", icon:"🌱", tag:"Recommandé" },
  { id:2, name:"Anti-mousse liquide", desc:"Élimine la mousse durablement", price:"18,50€", icon:"🌿", tag:null },
  { id:3, name:"Désherbant sélectif", desc:"Respecte le gazon, élimine les mauvaises herbes", price:"22,00€", icon:"🪴", tag:"Populaire" },
  { id:4, name:"Regarnissage ray-grass", desc:"1kg · Couvre 50m²", price:"12,90€", icon:"🌾", tag:null },
  { id:5, name:"Biostimulant racinaire", desc:"Acides aminés + algues marines", price:"29,90€", icon:"💧", tag:"Pro" },
  { id:6, name:"Kit entretien complet", desc:"Engrais + anti-mousse + biostimulant", price:"59,90€", icon:"📦", tag:"Économie -20%" },
];

export default function Products() {
  const navigate = useNavigate();
  const { isPaid } = useSubscription();

  return (
    <div>
      <div style={header}>
        <div style={{ fontSize:20, fontWeight:800, color:"#a5d6a7" }}>🛒 Produits</div>
        <div style={{ fontSize:12, color:"#81c784", opacity:0.7, marginTop:4 }}>Recommandés pour votre gazon</div>
      </div>
      <div style={scroll}>

        {!isPaid && (
          <div style={{ ...card(), background:"rgba(249,168,37,0.1)", border:"1px solid rgba(249,168,37,0.3)", textAlign:"center", padding:14, marginBottom:4 }}>
            <div style={{ fontSize:13, color:"#f9a825", fontWeight:700, marginBottom:6 }}>
              ⭐ Premium — Produits personnalisés selon votre score
            </div>
            <div style={{ fontSize:12, color:"#81c784", marginBottom:10 }}>
              Les membres Premium reçoivent des recommandations adaptées à leur gazon et leur météo locale
            </div>
            <button onClick={() => navigate("/subscribe")} style={{ ...btn.primary, width:"auto", padding:"8px 20px", fontSize:12 }}>
              Passer Premium
            </button>
          </div>
        )}

        {PRODUCTS.map(p => (
          <div key={p.id} style={{ ...card(), display:"flex", gap:12, alignItems:"center" }}>
            <div style={{ fontSize:36, minWidth:44, textAlign:"center" }}>{p.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ fontWeight:700, fontSize:14 }}>{p.name}</div>
                {p.tag && (
                  <span style={{ background:"rgba(76,175,80,0.25)", border:"1px solid rgba(76,175,80,0.4)", borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700, color:"#a5d6a7", whiteSpace:"nowrap", marginLeft:6 }}>
                    {p.tag}
                  </span>
                )}
              </div>
              <div style={{ fontSize:12, color:"#81c784", marginTop:2 }}>{p.desc}</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
                <span style={{ fontSize:16, fontWeight:800, color:"#a5d6a7" }}>{p.price}</span>
                <button style={{ background:"rgba(76,175,80,0.2)", border:"1px solid rgba(76,175,80,0.4)", borderRadius:8, padding:"6px 14px", color:"#e8f5e9", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                  Voir →
                </button>
              </div>
            </div>
          </div>
        ))}

        <div style={{ ...card(), textAlign:"center", padding:16, background:"rgba(255,255,255,0.03)" }}>
          <div style={{ fontSize:13, color:"#81c784", marginBottom:4 }}>
            💡 Ces produits sont sélectionnés par nos experts greenkeeper
          </div>
          <div style={{ fontSize:11, color:"#81c784", opacity:0.6 }}>
            Affiliation — Mongazon360 perçoit une commission sur les ventes
          </div>
        </div>

      </div>
    </div>
  );
}
