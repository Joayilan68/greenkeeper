// src/components/ConfianceDiagnostic.jsx
// Diagnostic photo : niveau de confiance de Bob et éléments observés ; photo qui ne permet pas de conclure
// (Diagnostic et essai sans compte). La confiance et les observations viennent de api/analyze-lawn.js.

const NIVEAUX = {
  elevee:  { label: "élevée",  couleur: "#66bb6a", texte: "Les signes sont bien visibles sur la photo." },
  moyenne: { label: "moyenne", couleur: "#ffa726", texte: "Un point reste à confirmer : vérifie-le sur place." },
  faible:  { label: "faible",  couleur: "#ef5350", texte: "Photo peu lisible : ce diagnostic est indicatif, une nouvelle photo permettra de le confirmer." },
};

const boite = (couleur) => ({ background:"rgba(255,255,255,0.04)", border:`1px solid ${couleur}55`, borderRadius:14, padding:"12px 14px", marginBottom:12 });

export default function ConfianceDiagnostic({ analysis, onReprendre }) {
  const niveau = NIVEAUX[analysis?.confiance];
  if (!niveau) return null;   // diagnostics enregistrés avant l'ajout de la confiance
  const faible = analysis.confiance === "faible";
  return (
    <div style={boite(niveau.couleur)}>
      <div style={{ fontSize:13, fontWeight:800, color:niveau.couleur, marginBottom:4 }}>🎯 Confiance {niveau.label}</div>
      <div style={{ fontSize:12, color:"#a5d6a7", lineHeight:1.5 }}>{niveau.texte}</div>
      {analysis.observations?.length > 0 && (
        <div style={{ marginTop:10 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#F1F8F2", marginBottom:4 }}>👀 Ce que Bob a vu</div>
          {analysis.observations.map((o, i) => (
            <div key={i} style={{ fontSize:12, color:"#81c784", padding:"2px 0", lineHeight:1.5 }}>• {o}</div>
          ))}
        </div>
      )}
      {faible && analysis.conseil_photo && (
        <div style={{ marginTop:10, fontSize:12, color:"#ffcc80", lineHeight:1.5 }}>📷 {analysis.conseil_photo}</div>
      )}
      {faible && onReprendre && (
        <button onClick={onReprendre} style={{ marginTop:10, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(165,214,167,0.35)",
          color:"#e8f5e9", borderRadius:10, padding:"10px 14px", fontSize:13, fontWeight:700, cursor:"pointer", width:"100%" }}>
          📷 Reprendre une photo
        </button>
      )}
    </div>
  );
}

// Photo inexploitable (floue, sombre, trop lointaine, sans gazon) : pas de score, explication de Bob et comment la reprendre
export function PhotoAReprendre({ analysis, children }) {
  return (
    <div style={{ ...boite("#ffa726"), padding:20, textAlign:"center" }}>
      <div style={{ fontSize:44, marginBottom:8 }}>📷</div>
      <div style={{ fontSize:16, fontWeight:800, color:"#F1F8F2", marginBottom:8 }}>Bob ne peut pas conclure avec cette photo</div>
      {analysis?.resume && <div style={{ fontSize:13, color:"#a5d6a7", lineHeight:1.6, marginBottom:10 }}>{analysis.resume}</div>}
      {analysis?.conseil_photo && (
        <div style={{ fontSize:13, color:"#ffcc80", lineHeight:1.6, background:"rgba(255,167,38,0.1)", borderRadius:10, padding:"10px 12px" }}>
          💡 {analysis.conseil_photo}
        </div>
      )}
      {children}
    </div>
  );
}
