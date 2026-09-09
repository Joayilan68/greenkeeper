// src/pages/DemoApp.jsx
// MODE DÉCOUVERTE — expérience 100% autonome pour le visiteur non connecté.
// Reproduit les écrans clés avec des DONNÉES D'EXEMPLE (aucun hook réel, aucune
// dépendance aux données utilisateur → zéro risque pour l'app authentifiée).
// Chaque action réelle renvoie vers l'inscription (+ 7 jours Premium).
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setAnonPending } from "../lib/anonId";
import { trackFunnel } from "../lib/funnel";

const G = {
  bg:    "linear-gradient(165deg,#0F2F1F 0%,#134025 45%,#0d2519 100%)",
  text:  "#F1F8F2", muted:"#A5D6A7", soft:"#81C784", faint:"#4a7c5c",
  card:  "rgba(255,255,255,0.06)", border:"1px solid rgba(165,214,167,0.16)", accent:"#66BB6A",
};
const TABS = [
  { id:"dashboard",  icon:"📊", label:"Dashboard" },
  { id:"diagnostic", icon:"🔬", label:"Diagnostic" },
  { id:"mon-gazon",  icon:"🌿", label:"Mon Gazon" },
  { id:"today",      icon:"📅", label:"Aujourd'hui" },
  { id:"produits",   icon:"🛒", label:"Produits" },
  { id:"classement", icon:"🏆", label:"Classement" },
];

const cardStyle = { background:G.card, border:G.border, borderRadius:16, padding:16, marginBottom:12 };
const titleStyle = { fontSize:13, fontWeight:800, color:G.muted, marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center" };

export default function DemoApp() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("dashboard");

  useEffect(() => { trackFunnel("demo_view"); }, []);
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, [tab]);

  const signup = (from) => {
    trackFunnel("signup_from_teaser", { from: `demo_${from}` });
    setAnonPending(true);
    navigate("/signup");
  };

  const Lock = ({ label = "Débloqué avec ton compte" }) => (
    <div style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:10.5, fontWeight:700,
      color:"#e4bc55", background:"rgba(228,188,85,0.12)", border:"1px solid rgba(228,188,85,0.3)",
      borderRadius:999, padding:"3px 9px" }}>🔒 {label}</div>
  );

  const CtaBtn = ({ children, from }) => (
    <button onClick={() => signup(from)} style={{
      background:"linear-gradient(135deg,#43A047,#2E7D32)", color:"#fff", border:"none",
      borderRadius:12, padding:"13px 18px", fontSize:14, fontWeight:800, cursor:"pointer",
      width:"100%", boxShadow:"0 6px 18px rgba(46,125,50,0.4)", fontFamily:"inherit" }}>
      {children}
    </button>
  );

  // ── Contenu par onglet (données d'exemple) ────────────────────────────────
  const screens = {
    dashboard: (
      <>
        <div style={{ ...cardStyle, background:"linear-gradient(135deg,rgba(27,94,32,0.4),rgba(13,43,26,0.6))", textAlign:"center" }}>
          <div style={{ fontSize:12, color:G.soft, marginBottom:4 }}>Score Santé de ta pelouse</div>
          <div style={{ fontSize:44, fontWeight:900, color:"#66bb6a", lineHeight:1 }}>68<span style={{ fontSize:18 }}>/100</span></div>
          <div style={{ fontSize:13, fontWeight:700, color:"#66bb6a", marginTop:4 }}>Bon 😐</div>
          <div style={{ fontSize:11.5, color:G.soft, marginTop:8, fontStyle:"italic" }}>« Belle densité générale, quelques zones à surveiller côté ombre. »</div>
        </div>
        <div style={cardStyle}>
          <div style={titleStyle}><span>🌤️ Météo &amp; arrosage</span></div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:G.text }}>
            <span>22°C · Ensoleillé</span><span style={{ color:G.soft }}>Pluie 0 mm</span>
          </div>
          <div style={{ fontSize:12, color:G.muted, marginTop:8, background:"rgba(76,175,80,0.1)", borderRadius:10, padding:"8px 10px" }}>
            💧 Conseil : arrose ~20 min ce soir, la chaleur assèche le sol.
          </div>
        </div>
        <div style={cardStyle}>
          <div style={titleStyle}><span>🤖 Les conseils de Bob</span></div>
          {["Relève ta tonte à 5 cm cette semaine — ça protège de la sécheresse.",
            "Zone plus claire près de la terrasse : surveille l'arrosage.",
            "Prochaine fertilisation conseillée dans 12 jours."].map((c,i) => (
            <div key={i} style={{ fontSize:12.5, color:G.soft, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>→ {c}</div>
          ))}
        </div>
        <CtaBtn from="dashboard">Créer mon compte — 7 jours Premium offerts</CtaBtn>
      </>
    ),

    diagnostic: (
      <div style={{ ...cardStyle, textAlign:"center", padding:24 }}>
        <div style={{ fontSize:48, marginBottom:10 }}>📸</div>
        <div style={{ fontSize:16, fontWeight:800, color:G.text, marginBottom:8 }}>Diagnostic photo par l'IA</div>
        <div style={{ fontSize:13, color:G.soft, lineHeight:1.6, marginBottom:18 }}>
          Prends une photo, Bob détecte maladies, carences et zones à problème, et te donne ton score /100.
        </div>
        <button onClick={() => navigate("/essai")} style={{
          background:"linear-gradient(135deg,#43A047,#2E7D32)", color:"#fff", border:"none", borderRadius:12,
          padding:"13px 18px", fontSize:14, fontWeight:800, cursor:"pointer", width:"100%", fontFamily:"inherit" }}>
          🔬 Faire mon diagnostic gratuit
        </button>
      </div>
    ),

    "mon-gazon": (
      <>
        <div style={cardStyle}>
          <div style={titleStyle}><span>🌿 Ta pelouse</span><Lock label="exemple" /></div>
          {[["Type","Gazon universel"],["Surface","120 m²"],["Objectif","Dense &amp; bien vert"],["Sol","Argileux"],["Exposition","Mi-ombre"]].map(([k,v]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ color:G.soft }}>{k}</span><span style={{ color:G.text, fontWeight:600 }} dangerouslySetInnerHTML={{ __html:v }} />
            </div>
          ))}
        </div>
        <div style={cardStyle}>
          <div style={titleStyle}><span>📋 Ton plan du mois</span></div>
          {["Semaine 1 — Tonte haute + scarification légère","Semaine 2 — Fertilisation azotée douce","Semaine 3 — Arrosage renforcé (chaleur)","Semaine 4 — Regarnissage des zones claires"].map((s,i) => (
            <div key={i} style={{ fontSize:12.5, color:G.soft, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>• {s}</div>
          ))}
        </div>
        <CtaBtn from="mon-gazon">Personnaliser pour MA pelouse →</CtaBtn>
      </>
    ),

    today: (
      <>
        <div style={{ ...cardStyle, textAlign:"center" }}>
          <div style={{ fontSize:12, color:G.soft }}> Tes tâches du jour</div>
          <div style={{ fontSize:15, fontWeight:800, color:G.text, marginTop:2 }}>Mardi · 22°C ☀️</div>
        </div>
        {[["💧","Arroser 20 min ce soir","La chaleur assèche — arrosage profond conseillé","urgent"],
          ["✂️","Tondre ce week-end à 5 cm","Hauteur haute pour résister à la sécheresse","normal"],
          ["🌾","Pas de fertilisation cette semaine","Trop chaud — reporte pour ne pas brûler",""]].map(([ic,t,d,tag],i) => (
          <div key={i} style={{ ...cardStyle, display:"flex", gap:12, alignItems:"flex-start", marginBottom:8 }}>
            <span style={{ fontSize:22 }}>{ic}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13.5, fontWeight:700, color:G.text }}>{t}
                {tag==="urgent" && <span style={{ fontSize:9, fontWeight:800, color:"#fff", background:"#e65100", borderRadius:20, padding:"2px 7px", marginLeft:7 }}>AUJOURD'HUI</span>}
              </div>
              <div style={{ fontSize:12, color:G.soft, marginTop:3 }}>{d}</div>
            </div>
          </div>
        ))}
        <CtaBtn from="today">Recevoir mon plan quotidien →</CtaBtn>
      </>
    ),

    produits: (
      <>
        <div style={{ fontSize:12, color:G.soft, marginBottom:12, textAlign:"center" }}>Sélection adaptée à ta pelouse et ta saison</div>
        {[["Engrais gazon été","Anti-jaunissement, longue durée","★★★★☆"],
          ["Semences regarnissage","Spécial zones claires & ombre","★★★★★"],
          ["Anti-mousse naturel","Sans danger animaux & enfants","★★★★☆"]].map(([n,d,stars],i) => (
          <div key={i} style={{ ...cardStyle, display:"flex", gap:12, alignItems:"center", marginBottom:8 }}>
            <div style={{ width:52, height:52, borderRadius:10, background:"rgba(76,175,80,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>🛒</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:G.text }}>{n}</div>
              <div style={{ fontSize:11.5, color:G.soft, margin:"2px 0" }}>{d}</div>
              <div style={{ fontSize:11, color:"#e4bc55" }}>{stars}</div>
            </div>
            <Lock label="prix" />
          </div>
        ))}
        <CtaBtn from="produits">Voir mes recommandations →</CtaBtn>
      </>
    ),

    classement: (
      <>
        <div style={{ ...cardStyle, textAlign:"center", background:"linear-gradient(135deg,rgba(46,125,50,0.35),rgba(13,43,26,0.6))" }}>
          <div style={{ fontSize:30 }}>🌳</div>
          <div style={{ fontSize:15, fontWeight:800, color:G.text }}>Ligue Gazon</div>
          <div style={{ fontSize:11.5, color:G.soft }}>Le niveau des vrais jardiniers — top 5 promus le 1ᵉʳ du mois</div>
        </div>
        <div style={cardStyle}>
          {[["🥇","Thomas","420",false],["🥈","Julie","385",false],["🥉","Marc","352",false],
            ["4","Toi (exemple)","310",true],["5","Sophie","298",false]].map(([r,n,p,me],i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 0", borderBottom:"1px solid rgba(255,255,255,0.05)",
              background: me ? "rgba(76,175,80,0.12)" : "none", borderRadius: me?10:0, paddingLeft: me?10:0, paddingRight: me?10:0 }}>
              <span style={{ width:24, textAlign:"center", fontSize:15 }}>{r}</span>
              <span style={{ flex:1, fontSize:13, fontWeight: me?800:600, color: me?G.muted:G.text }}>{n}</span>
              <span style={{ fontSize:13, fontWeight:800, color:G.soft }}>{p} pts</span>
            </div>
          ))}
        </div>
        <CtaBtn from="classement">Entrer dans le classement →</CtaBtn>
      </>
    ),
  };

  return (
    <div style={{ background:G.bg, minHeight:"100vh", color:G.text, fontFamily:"'Nunito','Segoe UI',sans-serif" }}>
      {/* Bandeau Mode découverte */}
      <div style={{ position:"sticky", top:0, zIndex:50, background:"rgba(228,188,85,0.14)", borderBottom:"1px solid rgba(228,188,85,0.3)",
        backdropFilter:"blur(8px)", padding:"9px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
        <span style={{ fontSize:11.5, color:"#f0d68a", fontWeight:600, lineHeight:1.3 }}>🌱 Mode découverte — données d'exemple</span>
        <button onClick={() => signup("banner")} style={{ flexShrink:0, background:"#43A047", color:"#fff", border:"none", borderRadius:8,
          padding:"6px 12px", fontSize:11.5, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>S'inscrire</button>
      </div>

      <div style={{ maxWidth:430, margin:"0 auto", padding:"16px 16px 96px" }}>
        {/* En-tête */}
        <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:16 }}>
          <img src="/mg360-mascot-transparent.png" alt="" style={{ width:32, height:32, objectFit:"contain" }} />
          <span style={{ fontSize:16, fontWeight:800, color:G.muted }}>Mongazon360<sup style={{ fontSize:8, color:G.soft }}>™</sup></span>
        </div>
        {screens[tab]}
        <div style={{ fontSize:11, color:G.faint, textAlign:"center", marginTop:16 }}>
          Aperçu avec des données d'exemple. Crée ton compte pour ta vraie pelouse — 7 jours Premium offerts, puis gratuit.
        </div>
      </div>

      {/* Barre de navigation (comme l'app) */}
      <nav style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430,
        background:"rgba(13,43,26,0.97)", backdropFilter:"blur(20px)", borderTop:"1px solid rgba(165,214,167,0.15)",
        display:"flex", justifyContent:"space-around", padding:"8px 0 20px", zIndex:100 }}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2,
              background:"none", border:"none", cursor:"pointer", color: active ? "#a5d6a7" : "#4a7c5c",
              fontSize:9, fontWeight: active ? 700 : 500, padding:"4px 6px" }}>
              <span style={{ fontSize:20 }}>{t.icon}</span>
              <span>{t.label}</span>
              {active && <div style={{ width:4, height:4, borderRadius:"50%", background:"#43a047", marginTop:1 }} />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
