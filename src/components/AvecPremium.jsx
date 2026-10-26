// src/components/AvecPremium.jsx
// Carte « Avec Premium » des comptes gratuits (accueil, diagnostic) : ce que Premium ajoute (src/lib/niveaux.json), l'offre
// de saison pendant sa période, et le lien vers « Choisir son niveau ».
import { useNavigate } from "react-router-dom";
import NIVEAUX from "../lib/niveaux.json";
import { OFFRE, offreEnCours, enEuros } from "../lib/offreSaison";
import { card } from "../lib/styles";

export default function AvecPremium({ tuile, bouton = "Découvrir Premium" }) {
  const navigate = useNavigate();
  const offre = offreEnCours();
  return (
    <div data-tuile={tuile} style={{ ...card(), textAlign:"left", background:"linear-gradient(135deg,rgba(245,158,11,0.18),rgba(13,43,26,0.85))", border:"1px solid rgba(245,158,11,0.45)" }}>
      <div style={{ fontSize:14, fontWeight:900, color:"#ffe082", marginBottom:8 }}>⭐ Avec Premium</div>
      {NIVEAUX.premium.avantages.map(f => <div key={f} style={{ fontSize:12, color:"#e8f5e9", padding:"3px 0", lineHeight:1.45 }}>✔ {f}</div>)}
      <button onClick={() => navigate("/subscribe")} style={{ width:"100%", marginTop:10, background:"linear-gradient(135deg,#F59E0B,#D97706)", color:"#1a1a1a", fontWeight:900, border:"none", borderRadius:10, cursor:"pointer", padding:"11px", fontSize:13 }}>
        {bouton}
      </button>
      <div style={{ fontSize:11, color:"#ffe082", textAlign:"center", marginTop:8, lineHeight:1.5 }}>
        {offre
          ? `Offre ${offre.nom === "hiver" ? "d'hiver" : "d'été"} : 1 an à ${enEuros(OFFRE.prixOffre)} au lieu de ${enEuros(OFFRE.prixAnnuel)}, jusqu'au ${offre.finLabel}`
          : `${enEuros(OFFRE.prixMensuel)} par mois ou ${enEuros(OFFRE.prixAnnuel)} par an, sans engagement`}
      </div>
    </div>
  );
}
