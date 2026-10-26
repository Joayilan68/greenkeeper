// src/components/MesProgres.jsx
// Mon gazon → « Mes progrès » (refonte, décision de Jordan du 26/10/2026) : série, GreenPoints et classement mensuel ;
// les badges suivent dans Mon gazon. L'accueil n'en garde qu'un résumé (série et GreenPoints), qui ouvre cette section.
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

  return (
    <div id="progres" style={{ scrollMarginTop:16 }}>
      <div style={{ fontSize:11, fontWeight:800, color:"#81c784", letterSpacing:1.2, textTransform:"uppercase", margin:"6px 4px 8px" }}>🏅 Mes progrès</div>

      {/* ── SÉRIE ── */}
      <div data-tuile="mongazon-serie" style={{ background: enDanger ? "rgba(230,81,0,0.15)" : modeHiver ? "rgba(21,101,192,0.12)" : "rgba(76,175,80,0.12)", border:`1px solid ${enDanger ? "rgba(239,108,0,0.4)" : modeHiver ? "rgba(66,165,245,0.3)" : "rgba(102,187,106,0.35)"}`, borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <span style={{ fontSize:22 }}>{modeHiver ? "🛡️" : enDanger ? "⚠️" : "🔥"}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:14, color: enDanger ? "#ef9a9a" : modeHiver ? "#90caf9" : "#a5d6a7" }}>
            {streak > 0 ? `Série de ${streak} jour${streak > 1 ? "s" : ""}${modeHiver ? ", protégée" : ""}` : "Pas encore de série"}
          </div>
          <div style={{ fontSize:11, color: enDanger ? "#f57c00" : modeHiver ? "#64b5f6" : "#66BB6A", marginTop:2 }}>
            {modeHiver ? "1 connexion par semaine suffit cet hiver" : enDanger ? "Ouvre l'app aujourd'hui pour garder ta série !" : streak > 0 ? "Continue comme ça !" : "Ouvre l'app chaque jour pour la lancer."}
          </div>
        </div>
      </div>

      {/* ── GREENPOINTS ── */}
      <div data-tuile="mongazon-greenpoints" style={{ ...card(), padding:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <span style={{ fontWeight:700, color:"#66BB6A", fontSize:14 }}>🌿 GreenPoints</span>
          <span style={{ background: palier?.couleur || "#2e7d32", color:"white", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:600 }}>
            {palier?.icone} {palier?.label}
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:8 }}>
          <span style={{ fontSize:30, fontWeight:800, color:"#a5d6a7" }}>{gpTotal.toLocaleString("fr-FR")}</span>
          <span style={{ color:"#81c784", fontSize:12 }}>pts</span>
        </div>
        {prochainPalier && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#81c784", marginBottom:3 }}>
              <span>{palier?.label}</span>
              <span>{prochainPalier.icone} {prochainPalier.label} — {prochainPalier.min.toLocaleString("fr-FR")} pts</span>
            </div>
            <div style={{ background:"rgba(255,255,255,0.1)", borderRadius:8, height:6, overflow:"hidden" }}>
              <div style={{ width:`${progressPalier}%`, height:"100%", background:"linear-gradient(90deg,#43a047,#a5d6a7)", borderRadius:8, transition:"width 0.8s" }}/>
            </div>
          </div>
        )}
      </div>

      {/* ── CLASSEMENT MENSUEL (en pause l'hiver ; pendant la ligue d'hiver, renvoi vers l'onglet Quiz) ── */}
      <div data-tuile="mongazon-classement" style={{ ...card(), padding:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <span style={{ fontWeight:700, color:"#66BB6A", fontSize:14 }}>🏆 Classement</span>
          {classementActif ? (
            <span style={{ background: ligueActuelle?.couleurBg || "rgba(76,175,80,0.2)", color: ligueActuelle?.couleur || "#43a047", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:600, border:`1px solid ${ligueActuelle?.couleur || "#43a047"}44` }}>
              {ligueActuelle?.icone} Ligue {ligueActuelle?.label}
            </span>
          ) : <span style={{ fontSize:11, color:"#81c784" }}>😴 En pause</span>}
        </div>
        {classementActif ? (
          <>
            <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:8 }}>
              <span style={{ fontSize:30, fontWeight:800, color:"#a5d6a7" }}>{position}<span style={{ fontSize:14, color:"#81c784" }}>e</span></span>
              <span style={{ fontSize:12, color:"#81c784" }}>/ {totalJoueurs} joueurs · {pointsSemaine} pts cette semaine</span>
            </div>
            <div style={{ padding:"8px 10px", background: enZonePromotion ? "rgba(76,175,80,0.15)" : enZoneRetrogradation ? "rgba(230,81,0,0.15)" : "rgba(255,255,255,0.05)", borderRadius:10, color: enZonePromotion ? "#a5d6a7" : enZoneRetrogradation ? "#ef9a9a" : "#81c784", fontSize:12, fontWeight:500, marginBottom:10 }}>
              {messageClassement}{joursRestants <= 2 && <span style={{ fontWeight:700, color:"#f9a825" }}> — ⏰ Urgence !</span>}
            </div>
            <button onClick={() => navigate("/classement")} style={{ width:"100%", background:"rgba(76,175,80,0.2)", color:"#a5d6a7", border:"1px solid rgba(76,175,80,0.3)", borderRadius:10, padding:"9px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              Voir le classement complet →
            </button>
          </>
        ) : ligueHiver ? (
          <button onClick={() => navigate("/classement")} style={{ width:"100%", background:"rgba(76,175,80,0.2)", color:"#a5d6a7", border:"1px solid rgba(76,175,80,0.3)", borderRadius:10, padding:"9px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            🧠 Classement en pause : la ligue d'hiver t'attend dans l'onglet Quiz →
          </button>
        ) : (
          <div style={{ textAlign:"center", padding:"8px 0" }}>
            <div style={{ fontSize:13, color:"#81c784", marginBottom:4 }}>😴 Classement en pause jusqu'en février</div>
            <div style={{ fontSize:11, color:"#4a7c5c" }}>Profite de l'hiver pour préparer ta saison !</div>
          </div>
        )}
      </div>
    </div>
  );
}
