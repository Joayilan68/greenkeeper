// src/components/EvolutionScore.jsx
// Mon gazon : évolution du score depuis le 1er janvier (ou la 1re action de l'année), recalculé chaque semaine avec les
// actions et diagnostics connus à cette date (la météo reste celle du jour), en version compacte (décision de Jordan du
// 29/10/2026) ; actions de l'année, mêmes chiffres que le bilan de saison, et lien vers le bilan.
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
    <div data-tuile="mongazon-evolution-score" style={{ ...card(), padding:"12px 14px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6 }}>
        <span style={{ fontWeight:700, color:"#66BB6A", fontSize:13 }}>📈 Évolution du score</span>
        <span style={{ fontSize:10, color:"#81c784" }}>depuis le {scoreHistory[0].t.toLocaleDateString("fr-FR", { day:"numeric", month:"short" })}</span>
      </div>

      {/* Courbe en coordonnées 0-100 étirées sur la largeur (les points d'une polyline n'acceptent pas les %), points et
          dernier score par-dessus, en % pour rester ronds */}
      {scoreHistory.length > 1 && (() => {
        const w = 100 / (scoreHistory.length - 1);
        const y = (p) => 40 - ((p.score - minScore) / scoreRange) * 32;
        const dernier = scoreHistory[scoreHistory.length - 1];
        return (
          <div style={{ position:"relative", height:40 }}>
            <svg viewBox="0 0 100 40" preserveAspectRatio="none" width="100%" height="40" style={{ position:"absolute", inset:0 }}>
              <polyline points={scoreHistory.map((p,i) => `${i*w},${y(p)}`).join(" ")} fill="none" stroke="#43a047" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
            </svg>
            <svg width="100%" height="40" style={{ position:"absolute", inset:0, overflow:"visible" }}>
              {scoreHistory.map((p,i) => (scoreHistory.length <= 12 || i === scoreHistory.length - 1) && (
                <circle key={i} cx={`${i*w}%`} cy={y(p)} r="2.5" fill="#66BB6A"/>
              ))}
              <text x="100%" y={y(dernier) - 5} textAnchor="end" fill="#a5d6a7" fontSize="11" fontWeight="bold">{dernier.score}</text>
            </svg>
          </div>
        );
      })()}

      {/* Actions de l'année : seulement les types déjà faits, en une ligne */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:"4px 10px", marginTop:8, fontSize:11, color:"#a5d6a7" }}>
        <span style={{ color:"#81c784" }}>Actions {anneeEnCours} :</span>
        {TYPES_ACTIONS.some(({ cle }) => compteurs[cle] > 0)
          ? TYPES_ACTIONS.filter(({ cle }) => compteurs[cle] > 0).map(({ cle, icone, court }) => (
              <span key={cle} title={court} aria-label={`${court} : ${compteurs[cle]}`}><span aria-hidden="true">{icone}</span> <b>{compteurs[cle]}</b></span>
            ))
          : <span style={{ color:"#81c784" }}>aucune notée pour l'instant</span>}
      </div>

      {/* Bilan de saison : toute l'année, mis en avant du 15 novembre à fin février (aussi sur l'accueil) */}
      <div data-tuile="mongazon-bilan" role="button" onClick={() => navigate("/bilan")} style={{ marginTop:8, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, cursor:"pointer",
        borderRadius:10, padding:"7px 10px", ...(bilanDisponible()
          ? { background:"linear-gradient(135deg,rgba(249,168,37,0.22),rgba(13,43,26,0.4))", border:"1px solid rgba(249,168,37,0.45)" }
          : { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }) }}>
        <span style={{ fontSize:11, fontWeight:700, color: bilanDisponible() ? "#f9a825" : "#a5d6a7" }}>
          🏆 {bilanDisponible() ? `Ton bilan de saison ${anneeDuBilan()} est prêt` : `Mon bilan de saison ${anneeDuBilan()} (toute l'année)`}
        </span>
        <span style={{ color: bilanDisponible() ? "#f9a825" : "#81c784" }}>›</span>
      </div>
    </div>
  );
}
