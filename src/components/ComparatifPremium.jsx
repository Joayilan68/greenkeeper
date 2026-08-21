// src/components/ComparatifPremium.jsx
// Tableau comparatif Gratuit vs Premium — réutilisable.
// Utilisé sur : page Diagnostic (utilisateur Free) + page Souscription.
// Objectif : justifier le prix de l'abonnement par un socle d'arguments concrets
// (l'IA n'est qu'une ligne parmi d'autres — plus l'unique argument).
import React from "react";

const ROWS = [
  { f: "Score de santé de votre pelouse",          free: "✓",     prem: "✓" },
  { f: "Planning d'entretien personnalisé",        free: "✓",     prem: "✓" },
  { f: "GreenPoints, badges & ligues",             free: "✓",     prem: "✓" },
  { f: "Historique de vos interventions",          free: "✓",     prem: "✓" },
  { f: "Problèmes détectés sur le gazon",          free: "2 max", prem: "Tous" },
  { f: "Conseils personnalisés",                   free: "1",     prem: "Jusqu'à 3" },
  { f: "Météo temps réel & alertes",               free: "—",     prem: "✓" },
  { f: "Données agronomiques (ET₀, temp. du sol)", free: "—",     prem: "✓" },
  { f: "Arrosage précis (doses & durées)",         free: "—",     prem: "✓" },
  { f: "🤖 Bob, l'assistant IA gazon 24/7",        free: "—",     prem: "✓" },
  { f: "📸 Diagnostic photo par IA",               free: "—",     prem: "✓" },
  { f: "Score maximum atteignable",                free: "90 %",  prem: "100 %" },
];

function Cell({ val, premium }) {
  const isCheck = val === "✓";
  const isDash  = val === "—";
  const color = isDash
    ? "#5a6b60"
    : isCheck
      ? (premium ? "#66BB6A" : "#81c784")
      : (premium ? "#F5C77E" : "#c8e6c9");
  return (
    <div style={{ textAlign: "center", fontSize: 12.5, fontWeight: isCheck || isDash ? 700 : 800, color }}>
      {val}
    </div>
  );
}

export default function ComparatifPremium({ title = "Gratuit vs Premium" }) {
  const GRID = "1fr 60px 66px";
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(165,214,167,0.18)", borderRadius: 18, padding: 16, margin: "16px 0" }}>
      {title && (
        <div style={{ fontSize: 15, fontWeight: 800, color: "#a5d6a7", marginBottom: 4, textAlign: "center" }}>
          {title}
        </div>
      )}
      <div style={{ fontSize: 11, color: "#81c784", textAlign: "center", marginBottom: 14 }}>
        Tout ce que Premium débloque, en un coup d'œil
      </div>

      {/* En-tête colonnes */}
      <div style={{ display: "grid", gridTemplateColumns: GRID, alignItems: "end", gap: 6, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div />
        <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#81c784" }}>🆓 Gratuit</div>
        <div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "#1a1a1a", background: "linear-gradient(135deg,#F59E0B,#D97706)", borderRadius: 8, padding: "3px 0" }}>⭐ Premium</div>
      </div>

      {/* Lignes */}
      {ROWS.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: GRID, alignItems: "center", gap: 6, padding: "9px 0", borderBottom: i < ROWS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
          <div style={{ fontSize: 12.5, color: "#e8f5e9", fontWeight: 600, lineHeight: 1.3 }}>{r.f}</div>
          <Cell val={r.free} premium={false} />
          <Cell val={r.prem} premium={true} />
        </div>
      ))}
    </div>
  );
}
