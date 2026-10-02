import { card } from "../lib/styles";

// Arrosage connecté : zones et, dans « Aujourd'hui », les propositions à valider
export default function CarteArrosage({ arrosage, proposition, onCommande, envoi }) {
  return (
    <div style={{ ...card(), border:"1px solid rgba(100,181,246,0.3)" }}>
      <div style={{ fontSize:14, fontWeight:800, color:"#F1F8F2" }}>💧 {arrosage.nom}</div>
      <div style={{ fontSize:12, color:"#90caf9", margin:"4px 0 6px" }}>
        {arrosage.marque === "gardena" ? "Gardena" : "Rachio"} · {arrosage.zones.length} zone{arrosage.zones.length > 1 ? "s" : ""}
        {arrosage.suspendu === "veille" ? " · en veille" : arrosage.suspendu ? " · programmes suspendus" : ""}
        {arrosage.enLigne === false ? " · hors ligne" : ""}
      </div>
      {proposition && onCommande && (
        <div style={{ marginTop:8, background:"rgba(255,255,255,0.05)", borderRadius:10, padding:"10px 12px" }}>
          <div style={{ fontSize:12, color:"#e8f5e9", marginBottom: proposition.boutons.length ? 8 : 0, lineHeight:1.5 }}>💡 {proposition.message}</div>
          {proposition.boutons.map(b => (
            <button key={`${b.commande}-${b.zone || ""}`} onClick={() => onCommande(b)} disabled={envoi}
              style={{ width:"100%", marginBottom:6, background:"linear-gradient(135deg,#1e88e5,#1565c0)", color:"#fff", border:"none", borderRadius:10, padding:"10px 12px", fontSize:13, fontWeight:800, cursor:"pointer", opacity: envoi ? 0.6 : 1 }}>
              {envoi ? "Envoi au programmateur…" : b.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
