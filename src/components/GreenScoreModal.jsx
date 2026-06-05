// src/components/GreenScoreModal.jsx
// ════════════════════════════════════════════════════════════════════════════
// MENTION 6 AVOCAT — Modal expliquant le système GreenScore
// ════════════════════════════════════════════════════════════════════════════
// Affichage en popup déclenché par le bouton "ℹ️ Comment ça marche ?" du Dashboard.
// Texte conforme aux exigences avocat (Cabinet Victoris).
// ════════════════════════════════════════════════════════════════════════════

export default function GreenScoreModal({ onClose }) {
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
            <span style={{ fontSize:24 }}>🌿</span>
            <div style={{ fontSize:16, fontWeight:800, color:"#a5d6a7" }}>
              Comment fonctionne le GreenScore ?
            </div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"50%", width:30, height:30, color:"#e8f5e9", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            ✕
          </button>
        </div>

        {/* Contenu scrollable */}
        <div style={{ flex:1, overflowY:"auto", padding:"18px 20px", color:"#e8f5e9", fontSize:13, lineHeight:1.7 }}>

          <div style={{ background:"rgba(33,150,243,0.08)", border:"1px solid rgba(33,150,243,0.25)", borderRadius:12, padding:"12px 14px", marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#90caf9", marginBottom:4 }}>
              ℹ️ Information importante
            </div>
            <div style={{ fontSize:12, color:"#e8f5e9", lineHeight:1.6 }}>
              Le GreenScore est un <strong>indicateur informatif</strong> calculé à partir de plusieurs critères. Il n'a aucune valeur scientifique absolue et ne remplace pas l'avis d'un professionnel du jardinage.
            </div>
          </div>

          {/* Section 1 — Calcul du score */}
          <div style={{ fontSize:14, fontWeight:800, color:"#66BB6A", marginBottom:8, marginTop:4 }}>
            📊 Le score est calculé sur 100 points
          </div>
          <div style={{ marginBottom:14 }}>
            Le GreenScore évalue la santé estimée de votre pelouse en pondérant 4 grandes catégories :
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:18 }}>
            {[
              { icon:"🛠️", label:"Maintenance",  weight:"40%", desc:"Fréquence des tontes, arrosages, traitements selon l'historique enregistré." },
              { icon:"💧", label:"Hydratation",  weight:"30%", desc:"Précipitations récentes et arrosages déclarés, croisés avec la météo locale." },
              { icon:"🌱", label:"Nutriments",   weight:"20%", desc:"Applications d'engrais déclarées par rapport au calendrier saisonnier optimal." },
              { icon:"🌍", label:"Type de sol",  weight:"10%", desc:"Composition du sol que vous avez renseignée dans votre profil (argileux, sableux, etc.)." },
            ].map(({ icon, label, weight, desc }) => (
              <div key={label} style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px 12px", border:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                  <span style={{ fontSize:20 }}>{icon}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#a5d6a7" }}>{label}</span>
                  <span style={{ marginLeft:"auto", fontSize:12, fontWeight:800, color:"#f9a825", background:"rgba(249,168,37,0.15)", padding:"2px 8px", borderRadius:8 }}>{weight}</span>
                </div>
                <div style={{ fontSize:11, color:"#81c784", lineHeight:1.6 }}>
                  {desc}
                </div>
              </div>
            ))}
          </div>

          {/* Section 2 — Bonus diagnostic photo */}
          <div style={{ fontSize:14, fontWeight:800, color:"#66BB6A", marginBottom:8 }}>
            📸 Bonus diagnostic photo (Premium)
          </div>
          <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px 12px", marginBottom:18, border:"1px solid rgba(255,255,255,0.06)", fontSize:12, color:"#81c784", lineHeight:1.6 }}>
            Si vous prenez une photo de votre pelouse, notre IA peut ajuster le score jusqu'à <strong style={{ color:"#a5d6a7" }}>± 30 points</strong> pendant <strong style={{ color:"#a5d6a7" }}>7 jours</strong>. Cette analyse est purement indicative.
          </div>

          {/* Section 3 — Échelle */}
          <div style={{ fontSize:14, fontWeight:800, color:"#66BB6A", marginBottom:8 }}>
            🎯 Échelle d'interprétation
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:18 }}>
            {[
              { range:"80 – 100", color:"#43a047", label:"Excellent", desc:"Pelouse en très bonne santé" },
              { range:"60 – 79",  color:"#66BB6A", label:"Bon",       desc:"Quelques améliorations possibles" },
              { range:"40 – 59",  color:"#f9a825", label:"Moyen",     desc:"Attention nécessaire" },
              { range:"0 – 39",   color:"#ef6c00", label:"Faible",    desc:"Action recommandée" },
            ].map(({ range, color, label, desc }) => (
              <div key={range} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 10px", background:"rgba(255,255,255,0.03)", borderRadius:8 }}>
                <span style={{ fontSize:11, fontWeight:800, color, minWidth:65 }}>{range}</span>
                <span style={{ fontSize:11, fontWeight:700, color:"#e8f5e9", minWidth:70 }}>{label}</span>
                <span style={{ fontSize:11, color:"#81c784" }}>{desc}</span>
              </div>
            ))}
          </div>

          {/* Section 4 — Disclaimer */}
          <div style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:10, padding:"12px 14px", fontSize:11, color:"#fde68a", lineHeight:1.6 }}>
            <strong style={{ color:"#fbbf24" }}>⚠️ Important :</strong> Le GreenScore Mongazon360<sup style={{ fontSize:7 }}>™</sup> est un <strong>indicateur indicatif et ludique</strong> basé sur les données que vous renseignez et la météo locale. Il ne constitue pas un diagnostic agronomique professionnel. Pour des conseils experts, consultez un jardinier professionnel ou un service agronomique agréé.
          </div>

          {/* Footer marque déposée */}
          <div style={{ textAlign:"center", marginTop:18, fontSize:10, color:"#3a5c44" }}>
            GreenScore — Mongazon360<sup style={{ fontSize:7 }}>™</sup> — Marque déposée à l'EUIPO
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
