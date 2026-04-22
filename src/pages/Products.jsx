import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../lib/useSubscription";
import { useProfile } from "../lib/useProfile";
import { trackAmazonClick } from "../lib/useAmazonProducts";
import AMAZON_PRODUCTS from "../lib/amazonProducts";
import { card, btn, scroll } from "../lib/styles";

const CATEGORIES = [
  { id:"entretien", label:"Entretien courant", icon:"🌱", keys:["engraisStarter","engraisEte","engraisAutomne","engraisHiver"] },
  { id:"traitement", label:"Traitements",      icon:"💊", keys:["antiMousse","desherbage","biostimulant"] },
  { id:"renovation", label:"Rénovation",       icon:"🌾", keys:["regarnissage","aeration","verticut"] },
  { id:"materiel",   label:"Matériel",         icon:"🛠️", keys:["tonte"] },
];

const getBudgetTier = (budget) => {
  if (budget === "0-50" || budget === "inconnu") return "eco";
  if (budget === "50-150")  return "standard";
  if (budget === "150-300") return "qualite";
  if (budget === "300-600" || budget === "600+") return "premium";
  return "standard";
};

const calcQuantite = (surface, ratio, cond) => {
  if (!surface || !ratio || !cond) return 1;
  return Math.max(1, Math.ceil((surface * ratio) / cond));
};

const selectProduit = (key, tier, profile) => {
  const cat = AMAZON_PRODUCTS[key];
  if (!cat) return null;
  if (key === "regarnissage" && tier === "qualite") {
    const variante =
      profile?.pelouse === "sport" ? "sport"
      : (profile?.exposition === "ombrage" || profile?.exposition === "mi-ombre") ? "ombre"
      : (profile?.zone === "sud" || profile?.zone === "sud_ouest") ? "secheresse"
      : "universel";
    return cat.tiers.qualite?.[variante] ?? cat.tiers.standard;
  }
  if (key === "tonte") {
    const surface  = profile?.surface || 100;
    const tierData = cat.tiers[tier] ?? cat.tiers.standard;
    if (Array.isArray(tierData)) {
      return tierData.find(p => (!p.surfaceMin || surface >= p.surfaceMin) && (!p.surfaceMax || surface <= p.surfaceMax)) || tierData[0];
    }
    return tierData;
  }
  return cat.tiers[tier] ?? cat.tiers.standard ?? cat.tiers.eco;
};

// ── 1 ligne par type de produit, sélection auto selon budget ──────────────────
function ProductRow({ amazonKey, tier, profile }) {
  const cat     = AMAZON_PRODUCTS[amazonKey];
  const produit = selectProduit(amazonKey, tier, profile);
  if (!cat || !produit) return null;

  const surface = profile?.surface || 100;
  let quantite  = 1;
  if (cat.ratioGM2  && cat.conditionnement) quantite = calcQuantite(surface, cat.ratioGM2,  cat.conditionnement);
  if (cat.ratioMlM2 && cat.conditionnement) quantite = calcQuantite(surface, cat.ratioMlM2, cat.conditionnement);

  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#e8f5e9", lineHeight:1.4, marginBottom:3 }}>
          {cat.label}
        </div>
        <div style={{ fontSize:11, color:"#81c784" }}>
          {produit.label}
        </div>
        {quantite > 1 && (
          <div style={{ fontSize:11, color:"#66BB6A", marginTop:4 }}>
            📐 Pour {surface} m² : {quantite} unité{quantite > 1 ? "s" : ""}
          </div>
        )}
      </div>
      <button
        onClick={() => { trackAmazonClick(amazonKey, null, 0); window.open(produit.url, "_blank", "noopener,noreferrer"); }}
        style={{ background:"#FF9900", border:"none", borderRadius:8, padding:"9px 14px", color:"#111", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}
      >
        🛒 Amazon →
      </button>
    </div>
  );
}

export default function Products() {
  const navigate    = useNavigate();
  const { isPaid }  = useSubscription();
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState("entretien");

  const tier = isPaid ? getBudgetTier(profile?.budget) : "standard";
  const cat  = CATEGORIES.find(c => c.id === activeTab) || CATEGORIES[0];

  return (
    <div>
      <div style={{ padding:"48px 20px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <img src="/mg360-mascot-transparent.png" alt="MG360" style={{ width:40, height:40, objectFit:"contain" }} />
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:"#F1F8F2" }}>Produits</div>
            <div style={{ fontSize:12, color:"#66BB6A", marginTop:2 }}>Sélection adaptée · Recherche Amazon en direct</div>
          </div>
        </div>
      </div>

      <div style={scroll}>

        {isPaid && profile?.budget && (
          <div style={{ ...card(), background:"rgba(76,175,80,0.08)", border:"1px solid rgba(76,175,80,0.2)", padding:"10px 14px" }}>
            <div style={{ fontSize:12, color:"#a5d6a7" }}>
              ✅ Sélection adaptée à votre budget <strong>{profile.budget}€/an</strong>
              {profile?.surface ? ` · Surface ${profile.surface}m²` : ""}
            </div>
          </div>
        )}

        {!isPaid && (
          <div style={{ ...card(), background:"rgba(249,168,37,0.08)", border:"1px solid rgba(249,168,37,0.25)", textAlign:"center", padding:14 }}>
            <div style={{ fontSize:13, color:"#f9a825", fontWeight:700, marginBottom:6 }}>
              ⭐ Premium — Sélection ajustée à votre budget
            </div>
            <div style={{ fontSize:12, color:"#81c784", marginBottom:10 }}>
              Les membres Premium voient une sélection adaptée à leur budget annuel et à la surface de leur gazon
            </div>
            <button onClick={() => navigate("/subscribe")} style={{ background:"linear-gradient(135deg,#F59E0B,#D97706)", color:"#1a1a1a", fontWeight:800, border:"none", borderRadius:10, padding:"8px 20px", fontSize:12, cursor:"pointer", width:"auto" }}>
              Passer Premium
            </button>
          </div>
        )}

        <div style={{ display:"flex", gap:6, overflowX:"auto", padding:"0 0 4px", marginBottom:8 }}>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setActiveTab(c.id)} style={{
              background:   activeTab === c.id ? "rgba(76,175,80,0.3)" : "rgba(255,255,255,0.05)",
              border:       `1px solid ${activeTab === c.id ? "#43a047" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 20, padding:"6px 14px",
              color:        activeTab === c.id ? "#a5d6a7" : "#81c784",
              fontSize:     12, fontWeight: activeTab === c.id ? 700 : 400,
              cursor:"pointer", whiteSpace:"nowrap", flexShrink:0,
            }}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        <div style={card()}>
          <div style={{ fontSize:14, fontWeight:800, color:"#F1F8F2", marginBottom:4 }}>{cat.icon} {cat.label}</div>
          <div style={{ fontSize:11, color:"#81c784", marginBottom:12 }}>
            Résultats actualisés en temps réel sur Amazon · Prix et disponibilités gérés par Amazon
          </div>
          {cat.keys.map(key => (
            <ProductRow key={key} amazonKey={key} tier={tier} profile={profile} />
          ))}
        </div>

        <div style={{ ...card(), textAlign:"center", padding:16, background:"rgba(255,255,255,0.03)" }}>
          <div style={{ fontSize:12, color:"#81c784", marginBottom:4 }}>💡 Produits sélectionnés selon votre profil</div>
          <div style={{ fontSize:11, color:"#81c784", opacity:0.6 }}>
            Lien partenaire Amazon · Mongazon360 perçoit une commission sur les achats · Prix et disponibilités gérés par Amazon
          </div>
        </div>

      </div>
    </div>
  );
}
