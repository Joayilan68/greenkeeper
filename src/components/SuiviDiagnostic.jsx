// src/components/SuiviDiagnostic.jsx
// Diagnostic de suivi (src/lib/suiviDiagnostic.js), sur la page Diagnostic uniquement : travaux faits après le dernier
// diagnostic (à indiquer ou notés) et proposition de la photo de suivi sur l'accueil, comparaison avant / après sur le
// résultat.
import { useState } from "react";
import { dateDuJour, saisieDuJour, aujourdhui, ACTIONS_SUIVIES, AVANT_JOURS } from "../lib/suiviDiagnostic";

const dateCourte = (n) => dateDuJour(n).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// « du 18 au 25 novembre » (même mois) ou « du 28 novembre au 5 décembre »
const periode = (a, b) => dateDuJour(a).getUTCMonth() === dateDuJour(b).getUTCMonth()
  ? `du ${dateDuJour(a).getUTCDate()} au ${dateCourte(b)}` : `du ${dateCourte(a)} au ${dateCourte(b)}`;
const carte = { background:"linear-gradient(135deg,rgba(27,94,32,0.45),rgba(13,43,26,0.6))", border:"1px solid rgba(102,187,106,0.35)",
  borderRadius:16, padding:"16px 16px 14px", marginBottom:12 };

export function PropositionSuivi({ suivi, children }) {
  return (
    <div style={carte}>
      <div style={{ fontSize:15, fontWeight:800, color:"#F1F8F2", marginBottom:6 }}>📸 C'est le moment du diagnostic de suivi</div>
      <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
        {suivi.avant.imageUrl && <img src={suivi.avant.imageUrl} alt="avant" style={{ width:64, height:64, borderRadius:10, objectFit:"cover", flexShrink:0 }} />}
        <div style={{ fontSize:12.5, color:"#a5d6a7", lineHeight:1.55 }}>
          {majuscule(suivi.libelle)} du {dateCourte(suivi.dateAction)} {suivi.pluriel ? "ont" : "a"} {suivi.jours} jours. Refais une
          photo du même endroit : Bob la compare avec celle d'avant ({suivi.avant.score}/100).
        </div>
      </div>
      {children}
    </div>
  );
}

const puce = (actif) => ({ padding:"8px 12px", borderRadius:999, fontSize:13, fontWeight:700, cursor:"pointer",
  border: actif ? "1px solid #66bb6a" : "1px solid rgba(165,214,167,0.35)",
  background: actif ? "rgba(67,160,71,0.35)" : "transparent", color: actif ? "#F1F8F2" : "#a5d6a7" });
const bouton = { padding:"10px 16px", borderRadius:10, border:"none", fontSize:13, fontWeight:800, cursor:"pointer" };

// Travaux faits après le dernier diagnostic : à indiquer (travaux et date, entre le jour du diagnostic et AVANT_JOURS
// après) ou notés (période de la photo de suivi, « Modifier »). onEnregistrer(actions, date) : actions vides = effacer.
export function TravauxSuivi({ diagnostic, travaux, onEnregistrer }) {
  const auj = aujourdhui();
  const max = Math.min(auj, diagnostic.t + AVANT_JOURS);
  const [edition, setEdition] = useState(!travaux);
  const [actions, setActions] = useState(diagnostic.travaux?.actions || []);
  const [date, setDate] = useState(diagnostic.travaux?.date || saisieDuJour(max));
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  if (!edition && travaux) return (
    <div style={carte}>
      <div style={{ fontSize:14, fontWeight:800, color:"#F1F8F2", marginBottom:6 }}>📝 Travaux notés</div>
      <div style={{ fontSize:12.5, color:"#a5d6a7", lineHeight:1.55, marginBottom:10 }}>
        {majuscule(travaux.libelle)} du {dateCourte(travaux.t)} : Bob te proposera ici une photo de suivi du même endroit
        {" "}{periode(travaux.echeance, travaux.fin)}, pour mesurer le résultat.
      </div>
      <button onClick={() => setEdition(true)} style={{ ...bouton, background:"transparent", border:"1px solid rgba(165,214,167,0.4)", color:"#e8f5e9" }}>
        Modifier
      </button>
    </div>
  );

  const basculer = (id) => setActions(a => a.includes(id) ? a.filter(x => x !== id) : [...a, id]);
  const enregistrer = async () => {
    setEnvoi(true); setErreur("");
    try { await onEnregistrer(actions, date); setEdition(false); }
    catch (e) { setErreur(e.message); }
    finally { setEnvoi(false); }
  };
  const effacer = travaux && !actions.length;
  return (
    <div style={carte}>
      <div style={{ fontSize:14, fontWeight:800, color:"#F1F8F2", marginBottom:6 }}>
        📝 Travaux faits après ton diagnostic du {dateCourte(diagnostic.t)} ?
      </div>
      <div style={{ fontSize:12.5, color:"#a5d6a7", lineHeight:1.55, marginBottom:10 }}>
        Indique-les ici : Bob te proposera une photo de suivi au bon moment pour mesurer le résultat.
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
        {ACTIONS_SUIVIES.map(a => (
          <button key={a.id} onClick={() => basculer(a.id)} aria-pressed={actions.includes(a.id)} style={puce(actions.includes(a.id))}>{a.nom}</button>
        ))}
      </div>
      <label style={{ display:"flex", alignItems:"center", gap:10, fontSize:13, color:"#a5d6a7", marginBottom:12 }}>
        Fait le
        <input type="date" value={date} min={saisieDuJour(diagnostic.t)} max={saisieDuJour(max)} onChange={e => setDate(e.target.value)}
          style={{ height:40, borderRadius:10, border:"1px solid rgba(165,214,167,0.35)", background:"rgba(255,255,255,0.08)", color:"#F1F8F2", padding:"0 10px", fontFamily:"inherit", fontSize:14, colorScheme:"dark" }} />
      </label>
      {erreur && <div style={{ fontSize:12, color:"#ef9a9a", marginBottom:10 }}>⚠️ {erreur}</div>}
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={enregistrer} disabled={envoi || !date || (!actions.length && !travaux)}
          style={{ ...bouton, background:"#2E7D32", color:"#fff", opacity: envoi || !date || (!actions.length && !travaux) ? 0.5 : 1 }}>
          {envoi ? "Enregistrement…" : effacer ? "Effacer les travaux" : "Enregistrer"}
        </button>
        {travaux && (
          <button onClick={() => { setEdition(false); setActions(diagnostic.travaux.actions); setDate(diagnostic.travaux.date); setErreur(""); }}
            style={{ ...bouton, background:"transparent", color:"#a5d6a7" }}>Annuler</button>
        )}
      </div>
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
