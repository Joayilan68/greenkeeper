// src/components/BadgesGallery.jsx
// Badges collectionnables : une ligne (nombre obtenu et derniers badges), dépliée en galerie (décision de Jordan du
// 29/10/2026). Débloqués en couleur, verrouillés en grisé (avec la condition affichée → donne un objectif). Bannière de
// félicitation à la première obtention. Alimenté par useBadges (aucune logique métier ici).
import { useState } from "react";
import { card } from "../lib/styles";

const RARETE_COLOR = {
  "Rare":            "#f9a825",
  "Très rare":       "#ef5350",
  "Édition limitée": "#ab47bc",
};

export default function BadgesGallery({ badges = [], nbUnlocked = 0, total = 0, justUnlocked = [], clearJustUnlocked }) {
  const [ouvert, setOuvert] = useState(false);
  const basculer = () => setOuvert(o => !o);
  const obtenus = badges.filter(b => b.unlocked).slice(-6);
  return (
    <div data-tuile="mongazon-badges" style={{ ...card(), padding:"12px 14px" }}>
      <div role="button" tabIndex={0} aria-expanded={ouvert} onClick={basculer}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); basculer(); } }}
        style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
        <span style={{ fontWeight:700, color:"#66BB6A", fontSize:13 }}>🏅 Badges</span>
        <span style={{ fontSize:11, color:"#81c784" }}>{nbUnlocked}/{total}</span>
        <span aria-hidden="true" style={{ flex:1, minWidth:0, fontSize:15, letterSpacing:2, textAlign:"right", whiteSpace:"nowrap", overflow:"hidden" }}>
          {obtenus.map(b => b.emoji).join("")}
        </span>
        <span style={{ fontSize:11, color:"#a5d6a7", fontWeight:700, whiteSpace:"nowrap" }}>{ouvert ? "Réduire ▲" : "Voir tout ▼"}</span>
      </div>

      {/* Bannière de félicitation (première obtention), même repliée */}
      {justUnlocked.length > 0 && (
        <div style={{ background:"rgba(249,168,37,0.15)", border:"1px solid rgba(249,168,37,0.4)", borderRadius:12, padding:"12px 14px", marginTop:10 }}>
          <div style={{ fontSize:13, fontWeight:800, color:"#f9a825", marginBottom:6 }}>🎉 Badge débloqué !</div>
          {justUnlocked.map(b => (
            <div key={b.id} style={{ fontSize:12, color:"#e8f5e9", lineHeight:1.5, marginBottom:4 }}>
              <span style={{ fontSize:16, marginRight:6 }}>{b.emoji}</span>{b.felicitation}
            </div>
          ))}
          <button onClick={clearJustUnlocked} style={{ marginTop:6, background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, padding:"4px 14px", color:"#a5d6a7", fontSize:11, fontWeight:700, cursor:"pointer" }}>
            OK
          </button>
        </div>
      )}

      {ouvert && <>
        <div style={{ fontSize:11, color:"#4a7c5c", margin:"10px 0 12px", lineHeight:1.5 }}>
          Rares et mérités : chaque badge est un vrai exploit. La difficulté fait la valeur.
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {badges.map(b => {
            const col = RARETE_COLOR[b.rarete] || "#a5d6a7";
            return (
              <div key={b.id} style={{
                background: b.unlocked ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                border:     `1px solid ${b.unlocked ? col + "66" : "rgba(255,255,255,0.08)"}`,
                borderRadius:12, padding:"10px 12px",
                opacity: b.unlocked ? 1 : 0.6,
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                  <span style={{ fontSize:22, lineHeight:1, filter: b.unlocked ? "none" : "grayscale(1)" }}>{b.emoji}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color: b.unlocked ? "#e8f5e9" : "#81c784", lineHeight:1.2 }}>{b.nom}</div>
                    <div style={{ fontSize:9, color:col, fontWeight:700 }}>
                      {b.rarete}{b.acces === "Premium" ? " · Premium" : ""}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize:10, color:"#81c784", lineHeight:1.4 }}>
                  {b.unlocked
                    ? "✅ Débloqué"
                    : (b.bientot ? "🔜 Bientôt disponible" : `🔒 ${b.condition}`)}
                </div>
              </div>
            );
          })}
        </div>
      </>}
    </div>
  );
}
