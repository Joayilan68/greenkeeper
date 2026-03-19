import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { calcLawnScore } from "../lib/lawnScore";
import { card, btn } from "../lib/styles";

export default function LawnScoreCard({ weather, profile, history, month, isPaid }) {
  const navigate = useNavigate();
  const [visualScore, setVisualScore] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const result = calcLawnScore({ weather, profile, history, month, visualScore });
  const { score, potential, label, color, issues, strengths } = result;

  // Arc SVG
  const radius = 54;
  const circumference = Math.PI * radius; // demi-cercle
  const progress = (score / 100) * circumference;

  return (
    <div style={{ ...card(), background: "linear-gradient(135deg, rgba(27,94,32,0.4), rgba(13,43,26,0.6))", border: `1px solid ${color}44` }}>
      
      {/* Score principal */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#81c784", fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>
          🌿 Score Santé du Gazon
        </div>

        {/* Demi-cercle SVG */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <svg width="140" height="80" viewBox="0 0 140 80">
            {/* Track */}
            <path
              d="M 10 75 A 60 60 0 0 1 130 75"
              fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" strokeLinecap="round"
            />
            {/* Progress */}
            <path
              d="M 10 75 A 60 60 0 0 1 130 75"
              fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${(score/100)*188} 188`}
              style={{ transition: "stroke-dasharray 1s ease" }}
            />
            {/* Score text */}
            <text x="70" y="68" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" fontFamily="Arial">
              {score}
            </text>
            <text x="70" y="78" textAnchor="middle" fill={color} fontSize="10" fontFamily="Arial">
              /100
            </text>
          </svg>
        </div>

        {/* Label + potentiel */}
        <div style={{ fontSize: 16, fontWeight: 800, color, marginTop: 4 }}>{label}</div>
        {isPaid && (
          <div style={{ fontSize: 12, color: "#81c784", marginTop: 4 }}>
            Potentiel : <span style={{ color: "#a5d6a7", fontWeight: 700 }}>{potential}/100</span>
            <span style={{ color: "#f9a825", marginLeft: 6 }}>+{potential - score} pts possibles</span>
          </div>
        )}
      </div>

      {/* Évaluation visuelle */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#81c784", marginBottom: 8, textAlign: "center" }}>
          Comment est votre gazon visuellement ?
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          {[
            { v: 1, emoji: "😟", label: "Mauvais" },
            { v: 2, emoji: "😐", label: "Moyen" },
            { v: 3, emoji: "🙂", label: "Bien" },
            { v: 4, emoji: "😊", label: "Très bien" },
            { v: 5, emoji: "🤩", label: "Parfait" },
          ].map(({ v, emoji, label }) => (
            <button key={v} onClick={() => setVisualScore(v)} style={{
              background: visualScore === v ? "rgba(76,175,80,0.3)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${visualScore === v ? "#43a047" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 10, padding: "6px 4px", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 44,
            }}>
              <span style={{ fontSize: 20 }}>{emoji}</span>
              <span style={{ fontSize: 9, color: "#81c784" }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Problèmes détectés */}
      {isPaid && issues.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <button onClick={() => setShowDetail(!showDetail)} style={{
            background: "none", border: "none", color: "#f9a825", cursor: "pointer",
            fontSize: 12, fontWeight: 700, padding: 0, width: "100%", textAlign: "left"
          }}>
            ⚠️ {issues.length} problème{issues.length > 1 ? "s" : ""} détecté{issues.length > 1 ? "s" : ""} {showDetail ? "▲" : "▼"}
          </button>
          {showDetail && (
            <div style={{ marginTop: 8 }}>
              {issues.map((issue, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 8px", background: "rgba(239,108,0,0.1)", borderRadius: 8, marginBottom: 4, fontSize: 12 }}>
                  <span>{issue.icon} {issue.label}</span>
                  <span style={{ color: "#ef9a9a" }}>{issue.impact} pts</span>
                </div>
              ))}
              {strengths.map((s, i) => (
                <div key={i} style={{ display: "flex", padding: "5px 8px", background: "rgba(76,175,80,0.1)", borderRadius: 8, marginBottom: 4, fontSize: 12, color: "#a5d6a7" }}>
                  {s.icon} {s.label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CTA selon tier */}
      {!isPaid ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#81c784", marginBottom: 8 }}>
            🔒 Débloquez le diagnostic complet et gagnez <span style={{ color: "#f9a825", fontWeight: 700 }}>+{potential - score} points</span>
          </div>
          <button onClick={() => navigate("/subscribe")} style={{ ...btn.primary, fontSize: 13, padding: "10px 20px", width: "auto" }}>
            ⭐ Améliorer mon gazon — 4,99€/mois
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "#81c784", textAlign: "center", opacity: 0.7 }}>
          Score mis à jour en temps réel · Basé sur météo + historique
        </div>
      )}
    </div>
  );
}
