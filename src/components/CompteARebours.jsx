import { useNavigate } from "react-router-dom";
import { card } from "../lib/styles";
import { compteARebours } from "../lib/printemps";

const dateCourte = (d) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

// Tableau de bord, du 1er novembre à la 1re tonte : garder le lien avec son gazon pendant l'hiver
export default function CompteARebours({ profile, soilTemp, isPaid }) {
  const navigate = useNavigate();
  const c = compteARebours(profile);
  if (!c) return null;

  const titre = c.jours <= 0 ? "C'est le moment de la 1re tonte !"
    : c.jours > 30 ? `1re tonte dans ~${Math.round(c.jours / 7)} semaines`
    : `1re tonte dans ~${c.jours} jour${c.jours > 1 ? "s" : ""}`;
  const solChaud = typeof soilTemp === "number" && soilTemp >= c.solPousse;

  return (
    <div data-tuile="accueil-compte-a-rebours" style={{ ...card(), background:"linear-gradient(135deg,rgba(129,199,132,0.14),rgba(13,43,26,0.6))", border:"1px solid rgba(129,199,132,0.3)" }}>
      <div style={{ fontSize:11, fontWeight:800, color:"#81c784", letterSpacing:1, textTransform:"uppercase" }}>🌱 Compte à rebours du printemps</div>
      <div style={{ fontSize:18, fontWeight:900, color:"#F1F8F2", margin:"6px 0 2px" }}>{titre}</div>
      <div style={{ fontSize:11, color:"#81c784" }}>Vers le {dateCourte(c.tonte)} en zone {c.zone}, selon la reprise de la pousse</div>
      <div style={{ height:6, background:"rgba(255,255,255,0.08)", borderRadius:4, margin:"10px 0" }}>
        <div style={{ width:`${Math.round(c.progression * 100)}%`, height:"100%", borderRadius:4, background:"linear-gradient(90deg,#43a047,#a5d6a7)" }} />
      </div>

      {c.jalons.map(j => (
        <div key={j.label} style={{ display:"flex", gap:8, fontSize:12, padding:"4px 0", color:"#e8f5e9" }}>
          <span>{j.icone}</span><span style={{ flex:1 }}>{j.label}</span>
          <span style={{ color:"#a5d6a7", fontWeight:700, whiteSpace:"nowrap" }}>{dateCourte(j.date)}</span>
        </div>
      ))}

      <div style={{ fontSize:11, color:"#a5d6a7", marginTop:8, lineHeight:1.5 }}>
        {typeof soilTemp === "number"
          ? `🌡️ Sol aujourd'hui : ${Math.round(soilTemp)}°C — l'herbe repart vers ${c.solPousse}°C.${solChaud && c.jours > 0 && c.jours <= 30 ? " Ça se réchauffe : surveille la pousse, la 1re tonte peut arriver plus tôt." : ""}`
          : isPaid ? "🌡️ Température du sol indisponible pour le moment."
          : "🌡️ En Premium, suis la température réelle de ton sol pour savoir quand l'herbe repart."}
      </div>
      <button onClick={() => navigate("/printemps")} style={{ marginTop:10, width:"100%", background:"rgba(67,160,71,0.25)", border:"1px solid rgba(129,199,132,0.4)", borderRadius:10, padding:"9px 12px", color:"#e8f5e9", fontSize:12, fontWeight:700, cursor:"pointer" }}>
        📋 Mon plan de printemps et ma liste d'achats →
      </button>
    </div>
  );
}
