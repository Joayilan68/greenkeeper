import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../lib/useSubscription";
import { useProfile } from "../lib/useProfile";
import { trackAmazonClick } from "../lib/useAmazonProducts";
import AMAZON_PRODUCTS from "../lib/amazonProducts";
import { card, btn, scroll } from "../lib/styles";

// ════════════════════════════════════════════════════════════════════════════
// PRODUCTS — Catalogue de produits Amazon partenaire
// ════════════════════════════════════════════════════════════════════════════
// Conforme aux exigences avocat (Cabinet Victoris) :
//   Mention 4 — Mention affiliation Amazon visible et explicite
//   Mention 5 — Avertissement phytosanitaire EAJ pour catégorie "Traitements"
// ════════════════════════════════════════════════════════════════════════════

const CATEGORIES = [
  { id:"entretien",  label:"Entretien courant", icon:"🌱", keys:["engraisStarter","engraisEte","engraisAutomne","engraisHiver"] },
  { id:"traitement", label:"Traitements",       icon:"💊", keys:["antiMousse","desherbage","biostimulant"], isPhyto: true },
  { id:"renovation", label:"Rénovation",        icon:"🌾", keys:["regarnissage","aeration","verticut"] },
  { id:"materiel",   label:"Matériel",          icon:"🛠️", keys:["tonte"] },
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

  const tier        = isPaid ? getBudgetTier(profile?.budget) : "standard";
  const cat         = CATEGORIES.find(c => c.id === activeTab) || CATEGORIES[0];
  const isPhytoCat  = cat.isPhyto === true;

  return (
    <div>
      <div style={{ padding:"48px 20px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <img src="/mg360-mascot-transparent.png" alt="Mongazon360" style={{ width:40, height:40, objectFit:"contain" }} />
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:"#F1F8F2" }}>Produits</div>
            <div style={{ fontSize:12, color:"#66BB6A", marginTop:2 }}>
              Mongazon360<sup style={{ fontSize:7 }}>™</sup> · Sélection adaptée · Recherche Amazon en direct
            </div>
          </div>
        </div>
      </div>

      <div style={scroll}>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MENTION 4 AVOCAT — BANDEAU AFFILIATION AMAZON (en haut, visible) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div style={{
          ...card(),
          background:"rgba(255,153,0,0.06)",
          border:"1px solid rgba(255,153,0,0.25)",
          padding:"12px 14px",
        }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
            <span style={{ fontSize:18, flexShrink:0 }}>ℹ️</span>
            <div style={{ fontSize:11, color:"#fde68a", lineHeight:1.6 }}>
              <strong style={{ color:"#fbbf24" }}>Liens partenaires Amazon.</strong>{" "}
              En tant que Partenaire Amazon, Mongazon360<sup style={{ fontSize:7 }}>™</sup> perçoit une commission sur les achats éligibles, sans surcoût pour vous. Prix et disponibilités gérés par Amazon.
            </div>
          </div>
        </div>

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

        {/* ── Tabs catégories ── */}
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

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MENTION 5 AVOCAT — AVERTISSEMENT PHYTOSANITAIRE EAJ              */}
        {/* Affiché uniquement sur la catégorie "Traitements"                */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isPhytoCat && (
          <div style={{
            ...card(),
            background:"rgba(198,40,40,0.06)",
            border:"1px solid rgba(198,40,40,0.3)",
            padding:"14px 16px",
            marginBottom:8,
          }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
              <span style={{ fontSize:22, flexShrink:0 }}>⚠️</span>
              <div>
                <div style={{ fontSize:12, fontWeight:800, color:"#ef9a9a", marginBottom:6 }}>
                  Produits phytosanitaires — Utilisation responsable obligatoire
                </div>
                <div style={{ fontSize:11, color:"#fecaca", lineHeight:1.6 }}>
                  Les produits de cette catégorie peuvent contenir des substances actives soumises à autorisation (gamme EAJ — Emploi Autorisé dans les Jardins).
                  <br/><br/>
                  <strong style={{ color:"#fee2e2" }}>Avant utilisation :</strong>
                  <ul style={{ margin:"4px 0 0 0", paddingLeft:18, lineHeight:1.7 }}>
                    <li>Lisez attentivement l'étiquette et la notice d'emploi</li>
                    <li>Respectez les doses, le matériel d'application et les délais de rentrée</li>
                    <li>Portez les équipements de protection individuelle (EPI) recommandés</li>
                    <li>Tenez hors de portée des enfants et des animaux domestiques</li>
                    <li>Respectez les délais avant récolte si proche d'un potager</li>
                  </ul>
                  <div style={{ marginTop:8, fontSize:10, fontStyle:"italic", color:"#fca5a5" }}>
                    Mongazon360<sup style={{ fontSize:7 }}>™</sup> n'est pas responsable d'une mauvaise utilisation. En cas de doute, consultez un professionnel ou les fiches{" "}
                    <a href="https://ephy.anses.fr/" target="_blank" rel="noopener noreferrer" style={{ color:"#fbbf24" }}>
                      e-Phy de l'ANSES
                    </a>.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Liste produits ── */}
        <div style={card()}>
          <div style={{ fontSize:14, fontWeight:800, color:"#F1F8F2", marginBottom:4 }}>{cat.icon} {cat.label}</div>
          <div style={{ fontSize:11, color:"#81c784", marginBottom:12 }}>
            Résultats actualisés en temps réel sur Amazon · Prix et disponibilités gérés par Amazon
          </div>
          {cat.keys.map(key => (
            <ProductRow key={key} amazonKey={key} tier={tier} profile={profile} />
          ))}
        </div>

        {/* ── Footer affiliation rappel + marque déposée ── */}
        <div style={{ ...card(), textAlign:"center", padding:16, background:"rgba(255,255,255,0.03)" }}>
          <div style={{ fontSize:12, color:"#81c784", marginBottom:4 }}>💡 Produits sélectionnés selon votre profil</div>
          <div style={{ fontSize:11, color:"#81c784", opacity:0.7, lineHeight:1.5 }}>
            En tant que Partenaire Amazon, Mongazon360<sup style={{ fontSize:7 }}>™</sup> perçoit une commission sur les achats éligibles · Prix et disponibilités gérés par Amazon
          </div>
          <div style={{ fontSize:9, color:"#3a5c44", marginTop:10, lineHeight:1.6 }}>
            © {new Date().getFullYear()} Mongazon360<sup style={{ fontSize:7 }}>™</sup> — Marque déposée à l'EUIPO
          </div>
        </div>

      </div>
    </div>
  );
}
