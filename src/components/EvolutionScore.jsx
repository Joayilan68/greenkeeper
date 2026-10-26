// src/components/EvolutionScore.jsx
// Mon gazon : évolution du score depuis le 1er janvier (ou la 1re action de l'année), recalculé chaque semaine avec les
// actions et diagnostics connus à cette date (la météo reste celle du jour) ; actions de l'année, mêmes chiffres que le
// bilan de saison, et lien vers le bilan.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { calcLawnScore } from "../lib/lawnScore";
import { anneeDuBilan, bilanDisponible, compterActions, actionsDeLAnnee, TYPES_ACTIONS } from "../lib/bilanSaison";
import { card } from "../lib/styles";

export default function EvolutionScore({ weather, profile, history = [], diagnostics = [] }) {
  const navigate = useNavigate();
  const { user } = useUser();
  const [actionsAnnee, setActionsAnnee] = useState(null);
  useEffect(() => {
    if (!user?.id) return;
    actionsDeLAnnee(user.id, new Date().getFullYear()).then(setActionsAnnee).catch(() => {});
  }, [user?.id, history.length]);

  const scoreHistory = (() => {
    const jour = (s) => { const [dd, mm, yy] = (s || "").split("/"); return new Date(yy, mm - 1, dd); };
    const actions = (actionsAnnee || history).map(a => ({ ...a, t: jour(a.date) })).filter(a => !isNaN(a.t));
    const aujourdHui = new Date(); aujourdHui.setHours(23, 59, 59, 0);
    const premiere = actions.reduce((m, a) => a.t < m ? a.t : m, aujourdHui);
    const debut = new Date(Math.max(new Date(aujourdHui.getFullYear(), 0, 1), premiere)); debut.setHours(23, 59, 59, 0);
    const pts = [];
    for (let d = new Date(debut); ; d.setDate(d.getDate() + 7)) {
      const t = d > aujourdHui ? aujourdHui : new Date(d);
      pts.push({ t, score: calcLawnScore({
        weather, profile, month: t.getMonth() + 1, ref: t.getTime(),
        history: actions.filter(a => a.t <= t),
        diagnostics: diagnostics.filter(x => new Date(x.date) <= t),
      }).score });
      if (t >= aujourdHui) break;
    }
    return pts;
  })();
  // Compteurs d'actions depuis le 1er janvier : toutes les actions de l'année en base ; en attendant, celles de
  // l'historique local de l'année
  const anneeEnCours = new Date().getFullYear();
  const compteurs = compterActions(actionsAnnee || history.filter(e => (e.date || "").endsWith(`/${anneeEnCours}`)));
  const minScore  = Math.min(...scoreHistory.map(p => p.score));
  const maxScore  = Math.max(...scoreHistory.map(p => p.score));
  const scoreRange = maxScore - minScore || 1;

  return (
    <div data-tuile="mongazon-evolution-score" style={{ ...card(), padding:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <span style={{ fontWeight:700, color:"#66BB6A", fontSize:14 }}>📈 Évolution du score</span>
        <span style={{ fontSize:11, color:"#81c784" }}>{anneeEnCours}, semaine par semaine</span>
      </div>

      <div style={{ position:"relative", height:60, marginBottom:8 }}>
        <svg width="100%" height="60" style={{ overflow:"visible" }}>
          {scoreHistory.length > 1 && (() => {
            const w = 100 / (scoreHistory.length - 1);
            const points = scoreHistory.map((p,i) => `${i*w}%,${60 - ((p.score - minScore) / scoreRange) * 50}`).join(" ");
            return (
              <>
                <polyline points={points} fill="none" stroke="#43a047" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
                {scoreHistory.map((p,i) => (scoreHistory.length <= 12 || i === scoreHistory.length - 1) && (
                  <circle key={i} cx={`${i*w}%`} cy={60 - ((p.score - minScore) / scoreRange) * 50} r="3" fill="#66BB6A"/>
                ))}
                <text x="100%" y={60 - ((scoreHistory[scoreHistory.length-1].score - minScore) / scoreRange) * 50 - 6} textAnchor="end" fill="#a5d6a7" fontSize="11" fontWeight="bold">{scoreHistory[scoreHistory.length-1].score}</text>
              </>
            );
          })()}
        </svg>
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#4a7c5c", marginBottom:12 }}>
        <span>{scoreHistory[0].t.toLocaleDateString("fr-FR", { day:"numeric", month:"short" })}</span>
        <span>Aujourd'hui</span>
      </div>

      <div style={{ fontSize:10, color:"#81c784", marginBottom:6 }}>Actions depuis le 1er janvier {anneeEnCours}</div>
      <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4 }}>
        {TYPES_ACTIONS.map(({ cle, icone, court }) => (
          <div key={cle} style={{ flexShrink:0, minWidth:56, background:"rgba(255,255,255,0.05)", borderRadius:10, padding:"8px 6px", textAlign:"center" }}>
            <div style={{ fontSize:16 }}>{icone}</div>
            <div style={{ fontSize:16, fontWeight:800, color:"#a5d6a7" }}>{compteurs[cle]}</div>
            <div style={{ fontSize:9, color:"#81c784" }}>{court}</div>
          </div>
        ))}
      </div>

      {/* Bilan de saison : toute l'année, mis en avant du 15 novembre à fin février (aussi sur l'accueil) */}
      <div data-tuile="mongazon-bilan" role="button" onClick={() => navigate("/bilan")} style={{ marginTop:10, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, cursor:"pointer",
        borderRadius:10, padding:"9px 12px", ...(bilanDisponible()
          ? { background:"linear-gradient(135deg,rgba(249,168,37,0.22),rgba(13,43,26,0.4))", border:"1px solid rgba(249,168,37,0.45)" }
          : { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }) }}>
        <span style={{ fontSize:12, fontWeight:700, color: bilanDisponible() ? "#f9a825" : "#a5d6a7" }}>
          🏆 {bilanDisponible() ? `Ton bilan de saison ${anneeDuBilan()} est prêt` : `Mon bilan de saison ${anneeDuBilan()} (toute l'année)`}
        </span>
        <span style={{ color: bilanDisponible() ? "#f9a825" : "#81c784" }}>›</span>
      </div>
    </div>
  );
}
