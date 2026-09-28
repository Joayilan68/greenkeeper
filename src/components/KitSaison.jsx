import { useNavigate } from "react-router-dom";
import { card } from "../lib/styles";
import { kitDuMois } from "../lib/kitSaison";
import { compteARebours } from "../lib/printemps";
import { ajouterAchat, achatsAnnee, euros } from "../lib/depenses";
import { trackAmazonClick } from "../lib/useAmazonProducts";

// Onglet Produits : kit de la saison en cours, calculé pour la surface et le budget de l'utilisateur ;
// en hiver, quand rien n'est de saison, la liste d'achats du plan de printemps prend sa place
export default function KitSaison({ profile, saveProfile, tier }) {
  const navigate = useNavigate();
  const kit = kitDuMois(profile, tier);
  if (!kit.items.length) return null;

  if (kit.aPreparer && compteARebours(profile)) return (
    <div onClick={() => navigate("/printemps")} style={{ ...card(), cursor:"pointer", background:"linear-gradient(135deg,rgba(76,175,80,0.14),rgba(13,43,26,0.6))", border:"1px solid rgba(76,175,80,0.35)" }}>
      <div style={{ fontSize:15, fontWeight:800, color:"#F1F8F2" }}>🌱 Ta liste d'achats du printemps</div>
      <div style={{ fontSize:12, color:"#a5d6a7", margin:"4px 0 0", lineHeight:1.5 }}>
        Engrais, semences et matériel pour tes {kit.surface} m², avec le calendrier de ta zone. Voir mon plan de printemps →
      </div>
    </div>
  );

  const dejaNote = achatsAnnee(profile).some(a => a.kit === kit.saison);
  const noterKit = () => {
    saveProfile(kit.items.reduce((p, i) => ajouterAchat(p, {
      label: `${i.cat.label} · ${i.produit.label}${i.quantite > 1 ? ` ×${i.quantite}` : ""}`, prix: i.prix, cle: i.cle, kit: kit.saison,
    }), profile));
  };

  return (
    <div style={{ ...card(), background:"linear-gradient(135deg,rgba(76,175,80,0.14),rgba(13,43,26,0.6))", border:"1px solid rgba(76,175,80,0.35)" }}>
      <div style={{ fontSize:15, fontWeight:800, color:"#F1F8F2" }}>{kit.icone} {kit.titre} · {kit.surface} m²</div>
      <div style={{ fontSize:11, color:"#81c784", margin:"2px 0 10px" }}>{kit.sousTitre}</div>

      {kit.items.map(i => (
        <div key={i.cle} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#e8f5e9" }}>{i.cat.label}{i.quantite > 1 ? ` ×${i.quantite}` : ""}</div>
            <div style={{ fontSize:11, color:"#81c784", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{i.produit.label}</div>
            {i.zones && <div style={{ fontSize:10, color:"#66BB6A" }}>Pour les zones abîmées (~30 % de la pelouse)</div>}
          </div>
          <span style={{ fontSize:12, color:"#a5d6a7", fontWeight:700, whiteSpace:"nowrap" }}>~{euros(i.prix)}</span>
          <button onClick={() => { trackAmazonClick(i.cle, null, 0); window.open(i.produit.url, "_blank", "noopener,noreferrer"); }}
            style={{ background:"#FF9900", border:"none", borderRadius:8, padding:"7px 10px", color:"#111", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
            🛒 Amazon
          </button>
        </div>
      ))}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10, gap:8 }}>
        <div style={{ fontSize:13, fontWeight:800, color:"#F1F8F2" }}>Total indicatif ~{euros(kit.total)}</div>
        {dejaNote ? (
          <span style={{ fontSize:11, color:"#66BB6A", fontWeight:700 }}>✓ Noté dans vos dépenses</span>
        ) : (
          <button onClick={noterKit} style={{ background:"#43a047", border:"none", borderRadius:8, padding:"7px 12px", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>
            ✓ J'ai acheté ce kit
          </button>
        )}
      </div>
      <div style={{ fontSize:10, color:"#4a7c5c", marginTop:6, lineHeight:1.5 }}>
        Quantités calculées pour votre surface, gamme selon votre budget. Prix indicatifs : le prix réel est celui d'Amazon ; un achat noté se retire ou se ressaisit dans « Mes dépenses ».
      </div>
    </div>
  );
}
