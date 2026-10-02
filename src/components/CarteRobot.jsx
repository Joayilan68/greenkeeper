import TONTE from "../lib/tonteGazon.json";
import { etatRobot } from "../lib/robot";
import { card } from "../lib/styles";

const heure = (ms) => new Date(ms).toLocaleString("fr-FR", { weekday:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });

// Hauteur de tonte conseillée pour le type de gazon et la saison (base, « Tonte Précise »)
function hauteurConseillee(profile, mois) {
  const t = TONTE.types[TONTE.alias[profile?.pelouse] || "universel"];
  return mois >= 6 && mois <= 8 ? t.ete : mois >= 9 ? t.automne : t.printemps;
}

// Robot tondeuse connecté : état, hauteur conseillée et, dans « Aujourd'hui », la proposition à valider
export default function CarteRobot({ robot, profile, proposition, onCommande, envoi }) {
  const mois = new Date().getMonth() + 1;
  return (
    <div style={{ ...card(), border:"1px solid rgba(129,199,132,0.3)" }}>
      <div style={{ fontSize:14, fontWeight:800, color:"#F1F8F2" }}>🤖 {robot.nom}</div>
      <div style={{ fontSize:12, color:"#a5d6a7", margin:"4px 0 8px" }}>
        {etatRobot(robot)}{typeof robot.batterie === "number" ? ` · batterie ${robot.batterie} %` : ""}
      </div>
      <div style={{ fontSize:11, color:"#81c784", lineHeight:1.7 }}>
        {robot.prochaine_tonte ? <>Prochaine tonte prévue : {heure(robot.prochaine_tonte)}<br/></> : null}
        Hauteur conseillée en ce moment : {hauteurConseillee(profile, mois)} cm{profile?.objectif === "naturel" ? " (+1 cm en objectif naturel)" : ""}
        {typeof robot.hauteur === "number" ? ` · réglage actuel du robot : niveau ${robot.hauteur}` : ""}
      </div>
      {proposition && onCommande && (
        <div style={{ marginTop:10, background:"rgba(255,255,255,0.05)", borderRadius:10, padding:"10px 12px" }}>
          <div style={{ fontSize:12, color:"#e8f5e9", marginBottom:8 }}>💡 {proposition.raison}</div>
          <button onClick={() => onCommande(proposition.commande)} disabled={envoi}
            style={{ width:"100%", background:"linear-gradient(135deg,#43a047,#2e7d32)", color:"#fff", border:"none", borderRadius:10, padding:"10px 12px", fontSize:13, fontWeight:800, cursor:"pointer", opacity: envoi ? 0.6 : 1 }}>
            {envoi ? "Envoi au robot…" : proposition.bouton}
          </button>
        </div>
      )}
    </div>
  );
}
