// src/components/MesProgres.jsx
// Mon gazon → « Mes progrès » (refonte, décision de Jordan du 26/10/2026) : série, GreenPoints et classement mensuel, en
// une seule carte (décision du 29/10/2026) ; les badges suivent dans Mon gazon. L'accueil n'en garde qu'un résumé (série
// et GreenPoints), qui ouvre cette section.
import { useNavigate } from "react-router-dom";
import { useProfile } from "../lib/useProfile";
import { useSubscription } from "../lib/useSubscription";
import { useGreenPoints } from "../lib/useGreenPoints";
import { useStreak } from "../lib/useStreak";
import { useClassement } from "../lib/useClassement";
import { useSaison } from "../lib/useSaison";
import { periodeLigue } from "../lib/ligueHiver";
import { card } from "../lib/styles";

export default function MesProgres() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { isPaid = false } = useSubscription() || {};
  const { classementActif } = useSaison();
  const { total: gpTotal, palier, prochainPalier, progressPalier, historique: gpHistorique } = useGreenPoints();
  const { actuel: streak, enDanger, modeHiver } = useStreak();
  const {
    ligueActuelle, position, totalJoueurs, pointsSemaine,
    enZonePromotion, enZoneRetrogradation, joursRestants, messageClassement,
  } = useClassement(gpHistorique, profile, isPaid);
  const ligueHiver = periodeLigue()?.statut === "en_cours";

  const separateur = <div style={{ height:1, background:"rgba(255,255,255,0.07)", margin:"10px 0" }} />;
  const lien = { width:"100%", background:"rgba(76,175,80,0.15)", color:"#a5d6a7", border:"1px solid rgba(76,175,80,0.3)", borderRadius:10, padding:"7px 10px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" };

  return (
    <div id="progres" style={{ ...card(), padding:"12px 14px", scrollMarginTop:16 }}>
      <div style={{ fontWeight:700, color:"#66BB6A", fontSize:13, marginBottom:10 }}>🏅 Mes progrès</div>

      {/* ── SÉRIE ── */}
      <div data-tuile="mongazon-serie" style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:20 }}>{modeHiver ? "🛡️" : enDanger ? "⚠️" : "🔥"}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:13, color: enDanger ? "#ef9a9a" : modeHiver ? "#90caf9" : "#a5d6a7" }}>
            {streak > 0 ? `Série de ${streak} jour${streak > 1 ? "s" : ""}${modeHiver ? ", protégée" : ""}` : "Pas encore de série"}
          </div>
          <div style={{ fontSize:11, color: enDanger ? "#f57c00" : modeHiver ? "#64b5f6" : "#66BB6A", marginTop:1 }}>
            {modeHiver ? "1 connexion par semaine suffit cet hiver" : enDanger ? "Ouvre l'app aujourd'hui pour garder ta série !" : streak > 0 ? "Continue comme ça !" : "Ouvre l'app chaque jour pour la lancer."}
          </div>
        </div>
      </div>

      {separateur}

      {/* ── GREENPOINTS ── */}
      <div data-tuile="mongazon-greenpoints">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#a5d6a7" }}>
            🌿 {gpTotal.toLocaleString("fr-FR")} <span style={{ fontSize:11, fontWeight:600, color:"#81c784" }}>GreenPoints</span>
          </span>
          <span style={{ background: palier?.couleur || "#2e7d32", color:"white", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:600, whiteSpace:"nowrap" }}>
            {palier?.icone} {palier?.label}
          </span>
        </div>
        {prochainPalier && (
          <div style={{ marginTop:6 }}>
            <div style={{ background:"rgba(255,255,255,0.1)", borderRadius:8, height:5, overflow:"hidden" }}>
              <div style={{ width:`${progressPalier}%`, height:"100%", background:"linear-gradient(90deg,#43a047,#a5d6a7)", borderRadius:8, transition:"width 0.8s" }}/>
            </div>
            <div style={{ fontSize:10, color:"#81c784", marginTop:3, textAlign:"right" }}>
              Prochain palier : {prochainPalier.icone} {prochainPalier.label} à {prochainPalier.min.toLocaleString("fr-FR")} pts
            </div>
          </div>
        )}
      </div>

      {separateur}

      {/* ── CLASSEMENT MENSUEL (en pause l'hiver ; pendant la ligue d'hiver, renvoi vers l'onglet Quiz) ── */}
      <div data-tuile="mongazon-classement">
        {classementActif ? (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:13, fontWeight:700, color:"#a5d6a7" }}>
                🏆 {position}<span style={{ fontSize:10 }}>e</span> <span style={{ fontSize:11, fontWeight:600, color:"#81c784" }}>/ {totalJoueurs} joueurs · {pointsSemaine} pts cette semaine</span>
              </span>
              <span style={{ background: ligueActuelle?.couleurBg || "rgba(76,175,80,0.2)", color: ligueActuelle?.couleur || "#43a047", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:600, border:`1px solid ${ligueActuelle?.couleur || "#43a047"}44`, whiteSpace:"nowrap" }}>
                {ligueActuelle?.icone} Ligue {ligueActuelle?.label}
              </span>
            </div>
            <div style={{ fontSize:11, marginTop:4, color: enZonePromotion ? "#a5d6a7" : enZoneRetrogradation ? "#ef9a9a" : "#81c784" }}>
              {messageClassement}{joursRestants <= 2 && <span style={{ fontWeight:700, color:"#f9a825" }}> — ⏰ Urgence !</span>}
            </div>
            <button onClick={() => navigate("/classement")} style={{ ...lien, marginTop:8 }}>Voir le classement complet →</button>
          </>
        ) : ligueHiver ? (
          <button onClick={() => navigate("/classement")} style={lien}>
            🧠 Classement en pause : la ligue d'hiver t'attend dans l'onglet Quiz →
          </button>
        ) : (
          <div style={{ fontSize:12, color:"#81c784" }}>
            😴 Classement en pause jusqu'en février <span style={{ fontSize:11, color:"#4a7c5c" }}>· profite de l'hiver pour préparer ta saison !</span>
          </div>
        )}
      </div>
    </div>
  );
}
