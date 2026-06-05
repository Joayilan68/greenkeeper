// src/components/LiguesModal.jsx
// ════════════════════════════════════════════════════════════════════════════
// MENTION 7 AVOCAT — Modal expliquant les règles des ligues du classement
// ════════════════════════════════════════════════════════════════════════════

import { LIGUES } from "../lib/useClassement";

export default function LiguesModal({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position:"fixed", inset:0, zIndex:1000,
        background:"rgba(0,0,0,0.7)",
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth:480, width:"100%", maxHeight:"85vh",
          background:"linear-gradient(180deg,#1a3d2b,#0d2b1a)",
          border:"1px solid rgba(165,214,167,0.25)",
          borderRadius:20,
          overflow:"hidden",
          display:"flex", flexDirection:"column",
          boxShadow:"0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:24 }}>🏆</span>
            <div style={{ fontSize:16, fontWeight:800, color:"#a5d6a7" }}>
              Règles des Ligues
            </div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"50%", width:30, height:30, color:"#e8f5e9", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            ✕
          </button>
        </div>

        {/* Contenu scrollable */}
        <div style={{ flex:1, overflowY:"auto", padding:"18px 20px", color:"#e8f5e9", fontSize:13, lineHeight:1.7 }}>

          {/* Section 1 — Saisonnalité */}
          <div style={{ fontSize:14, fontWeight:800, color:"#66BB6A", marginBottom:8 }}>
            📅 Quand le classement est-il actif ?
          </div>
          <div style={{ marginBottom:16 }}>
            Le classement Mongazon360<sup style={{ fontSize:7 }}>™</sup> est actif <strong>de février à octobre</strong>, en cohérence avec la saison d'entretien du gazon. De novembre à janvier, le classement est en pause hivernale (ton streak est conservé).
          </div>

          {/* Section 2 — Calcul du score */}
          <div style={{ fontSize:14, fontWeight:800, color:"#66BB6A", marginBottom:8, marginTop:4 }}>
            🧮 Comment ton score est-il calculé ?
          </div>
          <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"12px 14px", marginBottom:14, border:"1px solid rgba(255,255,255,0.06)", fontSize:12, color:"#e8f5e9", lineHeight:1.7 }}>
            <div style={{ textAlign:"center", fontSize:12, fontStyle:"italic", color:"#a5d6a7", marginBottom:10 }}>
              Score = (GreenPoints du mois × Coefficient profil) + Jours de connexion
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <div>
                <strong style={{ color:"#a5d6a7" }}>GreenPoints du mois :</strong>{" "}
                <span style={{ color:"#81c784" }}>chaque action enregistrée (tonte, arrosage, engrais, traitement...) rapporte des points.</span>
              </div>
              <div>
                <strong style={{ color:"#a5d6a7" }}>Coefficient profil :</strong>{" "}
                <span style={{ color:"#81c784" }}>plus ton profil est complet (type de gazon, sol, surface, exposition, budget), plus ton coefficient grimpe (jusqu'à ×1.50).</span>
              </div>
              <div>
                <strong style={{ color:"#a5d6a7" }}>Jours de connexion :</strong>{" "}
                <span style={{ color:"#81c784" }}>chaque ouverture quotidienne de l'app ajoute 1 point.</span>
              </div>
            </div>
          </div>

          {/* Section 3 — Les ligues */}
          <div style={{ fontSize:14, fontWeight:800, color:"#66BB6A", marginBottom:8 }}>
            🌿 Les 5 ligues
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:14 }}>
            {LIGUES.map((ligue) => (
              <div key={ligue.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:"rgba(255,255,255,0.03)", borderRadius:10 }}>
                <span style={{ fontSize:20 }}>{ligue.icone}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#a5d6a7" }}>Ligue {ligue.label}</div>
                  <div style={{ fontSize:10, color:"#81c784" }}>{ligue.description}</div>
                </div>
                <div style={{ fontSize:10, color:"#4a7c5c" }}>{ligue.taille} joueurs</div>
              </div>
            ))}
          </div>

          {/* Section 4 — Promotion / Relégation */}
          <div style={{ fontSize:14, fontWeight:800, color:"#66BB6A", marginBottom:8 }}>
            ⬆️⬇️ Promotion et relégation
          </div>
          <div style={{ marginBottom:14, fontSize:12, lineHeight:1.7, color:"#e8f5e9" }}>
            En fin de mois :
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:8 }}>
              <div style={{ background:"rgba(67,160,71,0.1)", padding:"8px 12px", borderRadius:8, borderLeft:"3px solid #43a047" }}>
                <strong style={{ color:"#a5d6a7" }}>Top 50%</strong> <span style={{ color:"#81c784" }}>→ promotion à la ligue supérieure 🎉</span>
              </div>
              <div style={{ background:"rgba(255,255,255,0.03)", padding:"8px 12px", borderRadius:8 }}>
                <strong style={{ color:"#e8f5e9" }}>Milieu de tableau</strong> <span style={{ color:"#81c784" }}>→ tu restes dans la même ligue</span>
              </div>
              <div style={{ background:"rgba(230,81,0,0.1)", padding:"8px 12px", borderRadius:8, borderLeft:"3px solid #e65100" }}>
                <strong style={{ color:"#ef9a9a" }}>Bas 25%</strong> <span style={{ color:"#81c784" }}>→ relégation à la ligue inférieure</span>
              </div>
            </div>
          </div>

          {/* Section 5 — Joueurs simulés */}
          <div style={{ fontSize:14, fontWeight:800, color:"#66BB6A", marginBottom:8 }}>
            🤖 Joueurs simulés (bots)
          </div>
          <div style={{ background:"rgba(33,150,243,0.06)", border:"1px solid rgba(33,150,243,0.2)", borderRadius:10, padding:"12px 14px", marginBottom:14, fontSize:12, color:"#e8f5e9", lineHeight:1.7 }}>
            Tant que Mongazon360<sup style={{ fontSize:7 }}>™</sup> compte <strong style={{ color:"#90caf9" }}>moins de 100 utilisateurs actifs</strong>, les ligues sont complétées par des joueurs simulés (bots). Ils permettent de garder le classement vivant et motivant.
            <br/><br/>
            Les bots sont toujours <strong style={{ color:"#90caf9" }}>signalés par l'icône 🤖</strong> à côté de leur nom. Tu peux donc les distinguer des vrais utilisateurs à tout moment.
            <br/><br/>
            <span style={{ fontSize:11, fontStyle:"italic", color:"#81c784" }}>
              Dès que la communauté grandira, les bots seront progressivement remplacés par de vrais utilisateurs.
            </span>
          </div>

          {/* Section 6 — Disclaimer */}
          <div style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:10, padding:"12px 14px", fontSize:11, color:"#fde68a", lineHeight:1.6 }}>
            <strong style={{ color:"#fbbf24" }}>⚠️ À noter :</strong> Le classement Mongazon360<sup style={{ fontSize:7 }}>™</sup> est un système ludique de gamification. Il n'offre aucune récompense monétaire ni avantage commercial. Son seul but est de rendre l'entretien de votre pelouse plus motivant.
          </div>

          {/* Footer marque déposée */}
          <div style={{ textAlign:"center", marginTop:18, fontSize:10, color:"#3a5c44" }}>
            Mongazon360<sup style={{ fontSize:7 }}>™</sup> — Marque déposée à l'EUIPO
          </div>
        </div>

        {/* Bouton fermer */}
        <div style={{ padding:"12px 20px", borderTop:"1px solid rgba(255,255,255,0.08)", flexShrink:0 }}>
          <button
            onClick={onClose}
            style={{
              width:"100%",
              background:"rgba(67,160,71,0.25)",
              border:"1px solid rgba(67,160,71,0.5)",
              borderRadius:12, padding:"12px",
              color:"#a5d6a7", fontSize:13, fontWeight:700,
              cursor:"pointer",
            }}
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
}
