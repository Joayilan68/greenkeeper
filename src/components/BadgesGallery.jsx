// src/components/BadgesGallery.jsx
// Galerie des badges collectionnables. Débloqués en couleur, verrouillés en grisé
// (avec la condition affichée → donne un objectif). Bannière de félicitation à la
// première obtention. Alimenté par useBadges (aucune logique métier ici).
import { card, cardTitle } from "../lib/styles";

const RARETE_COLOR = {
  "Rare":            "#f9a825",
  "Très rare":       "#ef5350",
  "Édition limitée": "#ab47bc",
};

export default function BadgesGallery({ badges = [], nbUnlocked = 0, total = 0, justUnlocked = [], clearJustUnlocked }) {
  return (
    <div style={card()}>
      <div style={cardTitle}>
        <span>🏅 Badges</span>
        <span style={{ fontSize:11, color:"#81c784" }}>{nbUnlocked}/{total}</span>
      </div>

      {/* Bannière de félicitation (première obtention) */}
      {justUnlocked.length > 0 && (
        <div style={{ background:"rgba(249,168,37,0.15)", border:"1px solid rgba(249,168,37,0.4)", borderRadius:12, padding:"12px 14px", marginBottom:12 }}>
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

      <div style={{ fontSize:11, color:"#4a7c5c", marginBottom:12, lineHeight:1.5 }}>
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
    </div>
  );
}
