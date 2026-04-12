import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../lib/useSubscription";
import { useProfile } from "../lib/useProfile";
import { trackAmazonClick } from "../lib/useAmazonProducts";
import AMAZON_PRODUCTS from "../lib/amazonProducts";
import { card, btn, scroll } from "../lib/styles";

// ─────────────────────────────────────────────────────────────────────────────
// Catalogue organisé par catégorie d'affichage
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id:    "entretien",
    label: "Entretien courant",
    icon:  "🌱",
    keys:  ["engraisStarter", "engraisEte", "engraisAutomne", "engraisHiver"],
  },
  {
    id:    "traitement",
    label: "Traitements",
    icon:  "💊",
    keys:  ["antiMousse", "desherbage", "biostimulant"],
  },
  {
    id:    "renovation",
    label: "Rénovation",
    icon:  "🌾",
    keys:  ["regarnissage", "aeration", "verticut"],
  },
  {
    id:    "materiel",
    label: "Matériel",
    icon:  "🛠️",
    keys:  ["tonte"],
  },
];

const TIER_LABELS = {
  eco:      "Éco",
  standard: "Standard",
  qualite:  "Qualité",
  premium:  "Premium",
};
const TIER_COLORS = {
  eco:      "#6B7280",
  standard: "#16A34A",
  qualite:  "#2563EB",
  premium:  "#D97706",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const getBudgetTier = (budgetAnnuel) => {
  if (typeof budgetAnnuel === "string") {
    if (budgetAnnuel === "0-50"  || budgetAnnuel === "inconnu") return "eco";
    if (budgetAnnuel === "50-150")  return "standard";
    if (budgetAnnuel === "150-300") return "qualite";
    if (budgetAnnuel === "300-600" || budgetAnnuel === "600+")  return "premium";
  }
  const b = typeof budgetAnnuel === "number" ? budgetAnnuel : parseInt(budgetAnnuel) || 0;
  if (b <= 50)  return "eco";
  if (b <= 150) return "standard";
  if (b <= 300) return "qualite";
  return "premium";
};

const calcQuantite = (surface, ratio, cond) => {
  if (!surface || !ratio || !cond) return 1;
  return Math.max(1, Math.ceil((surface * ratio) / cond));
};

// Sélectionne le produit du tier depuis le catalogue pour une clé donnée
const selectProduit = (key, tier, profile) => {
  const cat = AMAZON_PRODUCTS[key];
  if (!cat) return null;

  if (key === "regarnissage" && tier === "qualite") {
    const { usage, exposition, region } = profile || {};
    let variante = "universel";
    if (usage === "sport") variante = "sport";
    else if (exposition === "ombre" || exposition === "mi-ombre") variante = "ombre";
    else if (region === "sud") variante = "secheresse";
    return cat.tiers.qualite?.[variante] ?? cat.tiers.standard;
  }

  if (key === "tonte") {
    const surface = profile?.surface || 100;
    const tierData = cat.tiers[tier] ?? cat.tiers.standard;
    if (Array.isArray(tierData)) {
      return (
        tierData.find(
          p => (!p.surfaceMin || surface >= p.surfaceMin) && (!p.surfaceMax || surface <= p.surfaceMax)
        ) || tierData[0]
      );
    }
    return tierData;
  }

  return cat.tiers[tier] ?? cat.tiers.standard ?? cat.tiers.eco;
};

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composant : ligne produit dans la page catalogue
// ─────────────────────────────────────────────────────────────────────────────
function ProductRow({ amazonKey, tier, profile }) {
  const cat     = AMAZON_PRODUCTS[amazonKey];
  const produit = selectProduit(amazonKey, tier, profile);
  if (!cat || !produit) return null;

  const surface = profile?.surface || 100;
  let quantite  = 1;
  if (cat.ratioGM2  && cat.conditionnement) quantite = calcQuantite(surface, cat.ratioGM2, cat.conditionnement);
  if (cat.ratioMlM2 && cat.conditionnement) quantite = calcQuantite(surface, cat.ratioMlM2, cat.conditionnement);
  const prixTotal = produit.prix * quantite;

  const handleClick = () => {
    trackAmazonClick(amazonKey, produit.asin, prixTotal);
    window.open(produit.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={{
        display:         "flex",
        alignItems:      "center",
        gap:             12,
        padding:         "12px 0",
        borderBottom:    "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{
            fontSize:       10,
            fontWeight:     700,
            color:          "#fff",
            background:     TIER_COLORS[tier],
            borderRadius:   5,
            padding:        "1px 7px",
          }}>
            {TIER_LABELS[tier]}
          </span>
          <span style={{ fontSize: 11, color: "#9CA3AF" }}>{produit.marque}</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#e8f5e9", lineHeight: 1.3 }}>
          {produit.label}
        </div>
        {quantite > 1 && (
          <div style={{ fontSize: 11, color: "#66BB6A", marginTop: 2 }}>
            Pour {surface} m² : {quantite} unité{quantite > 1 ? "s" : ""}
          </div>
        )}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#F1F8F2", marginBottom: 4 }}>
          {prixTotal.toFixed(2)} €
        </div>
        <button
          onClick={handleClick}
          style={{
            background:    "#FF9900",
            border:        "none",
            borderRadius:  8,
            padding:       "6px 12px",
            color:         "#111",
            fontSize:      12,
            fontWeight:    700,
            cursor:        "pointer",
            whiteSpace:    "nowrap",
          }}
        >
          🛒 Amazon →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────────────────────
export default function Products() {
  const navigate       = useNavigate();
  const { isPaid }     = useSubscription();
  const { profile }    = useProfile();
  const [activeTab, setActiveTab] = useState("entretien");

  const tier = getBudgetTier(profile?.budget);
  const cat  = CATEGORIES.find(c => c.id === activeTab) || CATEGORIES[0];

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "48px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/mg360-mascot-transparent.png" alt="MG360" style={{ width: 40, height: 40, objectFit: "contain" }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#F1F8F2" }}>Produits</div>
            <div style={{ fontSize: 12, color: "#66BB6A", marginTop: 2 }}>
              {isPaid ? `Sélectionnés pour votre gazon · gamme ${TIER_LABELS[tier]}` : "Recommandés pour votre gazon"}
            </div>
          </div>
        </div>
      </div>

      <div style={scroll}>

        {/* Bannière Premium */}
        {!isPaid && (
          <div style={{ ...card(), background: "rgba(249,168,37,0.1)", border: "1px solid rgba(249,168,37,0.3)", textAlign: "center", padding: 14, marginBottom: 4 }}>
            <div style={{ fontSize: 13, color: "#f9a825", fontWeight: 700, marginBottom: 6 }}>
              ⭐ Premium — Produits personnalisés selon votre gamme budget
            </div>
            <div style={{ fontSize: 12, color: "#81c784", marginBottom: 10 }}>
              Les membres Premium voient les produits adaptés à leur budget et à la surface de leur gazon
            </div>
            <button onClick={() => navigate("/subscribe")} style={{ ...btn.primary, width: "auto", padding: "8px 20px", fontSize: 12 }}>
              Passer Premium
            </button>
          </div>
        )}

        {/* Onglets catégories */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 0 4px", marginBottom: 8 }}>
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveTab(c.id)}
              style={{
                background:   activeTab === c.id ? "rgba(76,175,80,0.3)"  : "rgba(255,255,255,0.05)",
                border:       `1px solid ${activeTab === c.id ? "#43a047" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 20,
                padding:      "6px 14px",
                color:        activeTab === c.id ? "#a5d6a7" : "#81c784",
                fontSize:     12,
                fontWeight:   activeTab === c.id ? 700 : 400,
                cursor:       "pointer",
                whiteSpace:   "nowrap",
                flexShrink:   0,
              }}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {/* Catalogue de la catégorie active */}
        <div style={card()}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#F1F8F2", marginBottom: 4 }}>
            {cat.icon} {cat.label}
          </div>
          {isPaid ? (
            <div style={{ fontSize: 11, color: "#66BB6A", marginBottom: 12 }}>
              Gamme <strong>{TIER_LABELS[tier]}</strong> — adaptée à votre budget · surface {profile?.surface || "?"}m²
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "#81c784", marginBottom: 12 }}>
              Gamme Standard · <span style={{ color: "#f9a825", cursor: "pointer", textDecoration: "underline" }} onClick={() => navigate("/subscribe")}>Premium pour votre gamme personnalisée</span>
            </div>
          )}

          {cat.keys.map(key => (
            <ProductRow
              key={key}
              amazonKey={key}
              tier={isPaid ? tier : "standard"}
              profile={profile}
            />
          ))}
        </div>

        {/* Disclaimer affilié */}
        <div style={{ ...card(), textAlign: "center", padding: 16, background: "rgba(255,255,255,0.03)" }}>
          <div style={{ fontSize: 13, color: "#81c784", marginBottom: 4 }}>
            💡 Ces produits sont sélectionnés par nos agronomes
          </div>
          <div style={{ fontSize: 11, color: "#81c784", opacity: 0.6 }}>
            Lien partenaire Amazon · Mongazon360 perçoit une commission sur les ventes · Prix indicatifs pouvant varier
          </div>
        </div>

      </div>
    </div>
  );
}
