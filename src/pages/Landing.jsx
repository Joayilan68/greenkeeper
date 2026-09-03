// src/pages/Landing.jsx
// Page d'accueil PUBLIQUE (visiteur non connecté) — vend la valeur AVANT l'inscription.
// Remplace l'ancien comportement « mur d'inscription » à l'arrivée sur mongazon360.fr.
import { useNavigate } from "react-router-dom";

const G = {
  bg:      "linear-gradient(165deg,#0F2F1F 0%,#164a2b 45%,#0d2519 100%)",
  text:    "#F1F8F2",
  muted:   "#A5D6A7",
  soft:    "#81C784",
  faint:   "#4a7c5c",
  card:    "rgba(255,255,255,0.06)",
  border:  "1px solid rgba(165,214,167,0.18)",
  accent:  "#66BB6A",
};

function CtaPrimary({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background:"linear-gradient(135deg,#43A047,#2E7D32)", color:"#fff", border:"none",
      borderRadius:16, padding:"16px 26px", fontSize:16, fontWeight:800, cursor:"pointer",
      width:"100%", boxShadow:"0 8px 24px rgba(46,125,50,0.45)", fontFamily:"inherit",
    }}>{children}</button>
  );
}

function Step({ n, icon, title, desc }) {
  return (
    <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
      <div style={{ flexShrink:0, width:40, height:40, borderRadius:12, background:"rgba(76,175,80,0.18)",
        border:"1px solid rgba(102,187,106,0.35)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{icon}</div>
      <div>
        <div style={{ fontSize:15, fontWeight:800, color:G.text }}>{n}. {title}</div>
        <div style={{ fontSize:13.5, color:G.soft, marginTop:2, lineHeight:1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div style={{ background:G.card, border:G.border, borderRadius:18, padding:"18px 16px", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)" }}>
      <div style={{ fontSize:24 }}>{icon}</div>
      <div style={{ fontSize:14.5, fontWeight:800, color:G.text, marginTop:8 }}>{title}</div>
      <div style={{ fontSize:12.5, color:G.soft, marginTop:4, lineHeight:1.5 }}>{desc}</div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const go = () => navigate("/login");

  return (
    <div style={{ background:G.bg, minHeight:"100vh", color:G.text, fontFamily:"'Nunito','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth:480, margin:"0 auto", padding:"0 18px 48px" }}>

        {/* ── En-tête ── */}
        <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 2px 8px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <img src="/mg360-mascot-transparent.png" alt="" style={{ width:38, height:38, objectFit:"contain" }} />
            <span style={{ fontSize:19, fontWeight:800, color:G.muted }}>Mongazon360<sup style={{ fontSize:9, marginLeft:1, color:G.soft }}>™</sup></span>
          </div>
          <button onClick={go} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(165,214,167,0.25)",
            color:"#e8f5e9", borderRadius:10, padding:"8px 14px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Se connecter
          </button>
        </header>

        {/* ── Hero ── */}
        <section style={{ paddingTop:22, textAlign:"center" }}>
          <div style={{ display:"inline-block", fontSize:12, fontWeight:700, letterSpacing:0.5, color:G.accent,
            background:"rgba(76,175,80,0.14)", border:"1px solid rgba(102,187,106,0.3)", borderRadius:999, padding:"5px 14px" }}>
            🌱 Bob, ton expert gazon
          </div>
          <h1 style={{ fontSize:32, lineHeight:1.12, fontWeight:900, margin:"18px 0 12px", letterSpacing:"-0.01em" }}>
            Un gazon magnifique,<br/><span style={{ color:G.accent }}>sans prise de tête.</span>
          </h1>
          <p style={{ fontSize:16, color:G.muted, lineHeight:1.55, margin:"0 auto 22px", maxWidth:400 }}>
            Prends ta pelouse en photo : <b style={{ color:G.text }}>Bob</b>, ton expert gazon, repère ce qui cloche et te construit un <b style={{ color:G.text }}>plan d'entretien personnalisé</b> selon ta météo, ton sol et tes objectifs.
          </p>

          {/* Avant / Après */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, margin:"0 0 22px" }}>
            {[["/gazon-avant.jpg","Avant","#ef9a9a"],["/gazon-apres.jpg","Après","#66BB6A"]].map(([src,label,col]) => (
              <div key={label} style={{ position:"relative", borderRadius:16, overflow:"hidden", border:G.border, aspectRatio:"4/3", background:"rgba(255,255,255,0.04)" }}>
                <img src={src} alt={`Gazon ${label}`} loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} onError={(e)=>{e.currentTarget.style.display="none";}} />
                <span style={{ position:"absolute", top:8, left:8, fontSize:11, fontWeight:800, color:"#0b1f12",
                  background:col, borderRadius:8, padding:"2px 9px" }}>{label}</span>
              </div>
            ))}
          </div>

          <CtaPrimary onClick={go}>📸 Diagnostiquer mon gazon</CtaPrimary>
          <div style={{ fontSize:12.5, color:G.accent, marginTop:10, fontWeight:700 }}>🎁 7 jours de Premium offerts</div>
          <div style={{ fontSize:11.5, color:G.faint, marginTop:3 }}>Sans carte bancaire · sans engagement · en 1 clic avec Google</div>
        </section>

        {/* ── Comment ça marche ── */}
        <section style={{ marginTop:44 }}>
          <h2 style={{ fontSize:20, fontWeight:800, textAlign:"center", margin:"0 0 20px" }}>Comment ça marche</h2>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Step n="1" icon="📸" title="Photographie ta pelouse" desc="Une simple photo depuis ton téléphone suffit." />
            <Step n="2" icon="🔍" title="Bob analyse ta photo en 10 secondes" desc="Maladies, manque d'eau, mousse, carences : il repère ce qui cloche." />
            <Step n="3" icon="📅" title="Reçois ton plan sur-mesure" desc="Un calendrier d'entretien adapté à ta météo locale, ton sol et ton objectif." />
          </div>
        </section>

        {/* ── Fonctionnalités ── */}
        <section style={{ marginTop:44 }}>
          <h2 style={{ fontSize:20, fontWeight:800, textAlign:"center", margin:"0 0 18px" }}>Tout pour une belle pelouse</h2>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Feature icon="🔬" title="Le diagnostic de Bob" desc="Il analyse ta photo et identifie les problèmes de ton gazon." />
            <Feature icon="🌦️" title="Arrosage intelligent" desc="Les bonnes doses au bon moment, calculées avec ta météo réelle." />
            <Feature icon="🏆" title="GreenPoints & ligues" desc="L'entretien devient un jeu : badges, séries, classement." />
            <Feature icon="🌱" title="Gratuit pour démarrer" desc="Ton score, ton planning et tes conseils, sans rien payer." />
          </div>
        </section>

        {/* ── Preuve / mission ── */}
        <section style={{ marginTop:44 }}>
          <div style={{ background:"rgba(76,175,80,0.10)", border:"1px solid rgba(102,187,106,0.28)", borderRadius:20, padding:"24px 20px", textAlign:"center" }}>
            <div style={{ fontSize:15, fontWeight:800, color:G.text, lineHeight:1.5 }}>
              Des jardiniers partout en France reprennent leur pelouse en main.
            </div>
            <div style={{ fontSize:13, color:G.soft, marginTop:8, lineHeight:1.55 }}>
              Fini les conseils génériques : Mongazon360 s'adapte à <i>ton</i> gazon, saison après saison.
            </div>
          </div>
        </section>

        {/* ── CTA final ── */}
        <section style={{ marginTop:36, textAlign:"center" }}>
          <h2 style={{ fontSize:22, fontWeight:900, margin:"0 0 6px" }}>Prêt à voir ton gazon changer ?</h2>
          <p style={{ fontSize:14, color:G.soft, margin:"0 0 18px" }}>7 jours de Premium offerts — sans carte bancaire.</p>
          <CtaPrimary onClick={go}>Commencer gratuitement</CtaPrimary>
          <div style={{ fontSize:13, color:G.soft, marginTop:14 }}>
            Déjà un compte ? <button onClick={go} style={{ background:"none", border:"none", color:G.accent, fontWeight:800, cursor:"pointer", fontSize:13, fontFamily:"inherit", padding:0 }}>Se connecter</button>
          </div>
          <div style={{ fontSize:13, color:G.soft, marginTop:8 }}>Tant qu'il y a gazon, il y a match. 🌿</div>
        </section>

        {/* ── Pied de page ── */}
        <footer style={{ marginTop:40, paddingTop:20, borderTop:"1px solid rgba(165,214,167,0.14)", textAlign:"center" }}>
          <div style={{ display:"flex", gap:16, justifyContent:"center", flexWrap:"wrap", fontSize:12 }}>
            <a href="/mentions-legales" style={{ color:G.soft, textDecoration:"none" }}>Mentions légales</a>
            <a href="/confidentialite" style={{ color:G.soft, textDecoration:"none" }}>Confidentialité</a>
            <a href="/cgu" style={{ color:G.soft, textDecoration:"none" }}>CGU</a>
          </div>
          <div style={{ fontSize:10.5, color:G.faint, marginTop:14, lineHeight:1.6, maxWidth:360, margin:"14px auto 0" }}>
            Mongazon360™ est une marque déposée à l'EUIPO — protégée dans les 27 pays de l'Union européenne.
          </div>
        </footer>

      </div>
    </div>
  );
}
