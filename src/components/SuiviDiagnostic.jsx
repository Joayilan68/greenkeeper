// src/components/SuiviDiagnostic.jsx
// Diagnostic de suivi (src/lib/suiviDiagnostic.js) : carte de proposition sur l'accueil du diagnostic et comparaison
// avant / après sur le résultat.
import { dateDuJour } from "../lib/suiviDiagnostic";

const dateCourte = (n) => dateDuJour(n).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const carte = { background:"linear-gradient(135deg,rgba(27,94,32,0.45),rgba(13,43,26,0.6))", border:"1px solid rgba(102,187,106,0.35)",
  borderRadius:16, padding:"16px 16px 14px", marginBottom:12 };

export function PropositionSuivi({ suivi, children }) {
  return (
    <div style={carte}>
      <div style={{ fontSize:15, fontWeight:800, color:"#F1F8F2", marginBottom:6 }}>📸 C'est le moment du diagnostic de suivi</div>
      <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
        {suivi.avant.imageUrl && <img src={suivi.avant.imageUrl} alt="avant" style={{ width:64, height:64, borderRadius:10, objectFit:"cover", flexShrink:0 }} />}
        <div style={{ fontSize:12.5, color:"#a5d6a7", lineHeight:1.55 }}>
          {majuscule(suivi.libelle)} du {dateCourte(suivi.dateAction)} a {suivi.jours} jours. Refais une photo du même endroit :
          Bob la compare avec celle d'avant ({suivi.avant.score}/100).
        </div>
      </div>
      {children}
    </div>
  );
}

const Liste = ({ titre, couleur, items }) => items.length > 0 && (
  <div style={{ fontSize:12, color:couleur, padding:"3px 0", lineHeight:1.5 }}><b>{titre}</b> {items.join(", ")}</div>
);

export function ComparaisonSuivi({ comparaison, imageApres, scoreApres }) {
  const { avant, ecart } = comparaison;
  const couleur = ecart >= 5 ? "#66bb6a" : ecart <= -5 ? "#ef5350" : "#ffa726";
  const bilan = ecart >= 5 ? "Ça progresse, bravo !" : ecart <= -5 ? "En recul : regarde les problèmes relevés ci-dessous."
    : "Stable : continue ton plan d'entretien.";
  const photo = (src, legende, score) => (
    <div style={{ flex:1, minWidth:0 }}>
      {src ? <img src={src} alt={legende} style={{ width:"100%", height:110, objectFit:"cover", borderRadius:10, display:"block" }} />
        : <div style={{ height:110, borderRadius:10, background:"rgba(255,255,255,0.06)" }} />}
      <div style={{ fontSize:11.5, color:"#81c784", marginTop:4, textAlign:"center" }}>{legende} · <b style={{ color:"#F1F8F2" }}>{score}/100</b></div>
    </div>
  );
  return (
    <div style={carte}>
      <div style={{ fontSize:14, fontWeight:800, color:"#F1F8F2", marginBottom:10 }}>
        📈 Depuis {comparaison.libelle} du {dateCourte(comparaison.dateAction)}
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:10 }}>
        {photo(avant.imageUrl, `Avant (${dateCourte(avant.t)})`, avant.score)}
        {photo(imageApres, "Aujourd'hui", scoreApres)}
      </div>
      <div style={{ fontSize:20, fontWeight:900, color:couleur, textAlign:"center" }}>{ecart > 0 ? "+" : ""}{ecart} pts</div>
      <div style={{ fontSize:12.5, color:"#a5d6a7", textAlign:"center", marginBottom:8 }}>{bilan}</div>
      <Liste titre="✅ Réglé :" couleur="#a5d6a7" items={comparaison.regles} />
      <Liste titre="⏳ Encore là :" couleur="#ffcc80" items={comparaison.restants} />
      <Liste titre="🆕 Nouveau :" couleur="#ef9a9a" items={comparaison.nouveaux} />
    </div>
  );
}
