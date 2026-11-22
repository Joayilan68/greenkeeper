// src/components/ConseilSemaine.jsx
// Carte « Le conseil de la semaine » de l'accueil connecté (chantier du 22/11, demande de Jordan du 30/10/2026) : un
// article de la saison qui change chaque lundi, ou le dernier sorti avec le badge « Nouveau » (src/lib/conseilsApp.js) ;
// lu dans l'app (/lire), avec le lien vers tous les conseils (ancienne tuile « Conseils gazon »).
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { card } from "../lib/styles";
import { chargerListe, conseilDeLaSemaine } from "../lib/conseilsApp";

const sansBouton = { display:"block", width:"100%", background:"none", border:"none", padding:0, textAlign:"left", cursor:"pointer",
  fontFamily:"inherit", color:"inherit" };

export default function ConseilSemaine() {
  const navigate = useNavigate();
  const [choix, setChoix] = useState(null);
  useEffect(() => { chargerListe().then(liste => setChoix(conseilDeLaSemaine(liste))).catch(() => {}); }, []);
  return (
    <div style={card()}>
      {choix && (
        <button data-tuile="accueil-conseil-semaine" onClick={() => navigate(`/lire/${choix.article.slug}`)} style={sansBouton}>
          <span style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, fontWeight:800, letterSpacing:1.2, textTransform:"uppercase", color:"#81C784" }}>
            📖 Le conseil de la semaine
            {choix.nouveau && <span style={{ fontSize:10, letterSpacing:0, textTransform:"none", color:"#0F2F1F", background:"#66BB6A", borderRadius:6, padding:"2px 6px" }}>Nouveau</span>}
          </span>
          <span style={{ display:"block", fontSize:15, fontWeight:800, color:"#F1F8F2", lineHeight:1.35, marginTop:8 }}>{choix.article.title}</span>
          <span style={{ display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", fontSize:12, color:"#81c784",
            lineHeight:1.5, marginTop:4 }}>{choix.article.description}</span>
          <span style={{ display:"block", fontSize:13, fontWeight:800, color:"#66BB6A", marginTop:8 }}>Lire l'article ›</span>
        </button>
      )}
      <button data-tuile="accueil-conseils" onClick={() => navigate("/lire")} style={{ ...sansBouton, display:"flex", alignItems:"center", gap:10,
        marginTop: choix ? 12 : 0, paddingTop: choix ? 12 : 0, borderTop: choix ? "1px solid rgba(165,214,167,0.15)" : "none" }}>
        <span style={{ fontSize:20 }}>📚</span>
        <span style={{ flex:1 }}>
          <span style={{ display:"block", fontSize:13, fontWeight:800, color:"#F1F8F2" }}>Tous les conseils gazon</span>
          <span style={{ display:"block", fontSize:12, color:"#81c784", lineHeight:1.5 }}>Nos guides saison par saison : tonte, arrosage, mousse, semis…</span>
        </span>
        <span style={{ color:"#81c784", fontSize:18 }}>›</span>
      </button>
    </div>
  );
}
