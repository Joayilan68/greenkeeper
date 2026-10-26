// src/pages/AccueilVisiteur.jsx
// Accueil d'un visiteur sans compte (refonte, décisions de Jordan du 26/10/2026 ; remplace la présentation et la démo) :
// il utilise l'app tout de suite — météo du jour de sa commune, conseil de Bob du jour, diagnostic photo d'essai,
// articles de saison — et crée un compte gratuit quand il veut garder son plan ou recevoir les alertes.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { trackFunnel, trackFunnelOncePerSession } from "../lib/funnel";
import { codeRecu } from "../lib/codeParrainage";
import { periodeLigue, dateLongue } from "../lib/ligueHiver";
import { RESEAUX } from "../lib/reseaux";
import { getWMO } from "../lib/lawn";
import NIVEAUX from "../lib/niveaux.json";
import CONSEILS_BOB from "../lib/conseilsBob.json";
import BarreVisiteur from "../components/BarreVisiteur";

const G = {
  bg:     "linear-gradient(165deg,#0F2F1F 0%,#164a2b 45%,#0d2519 100%)",
  text:   "#F1F8F2",
  muted:  "#A5D6A7",
  soft:   "#81C784",
  faint:  "#4a7c5c",
  card:   "rgba(255,255,255,0.06)",
  border: "1px solid rgba(165,214,167,0.18)",
  accent: "#66BB6A",
};
const carte = { background:G.card, border:G.border, borderRadius:18, padding:16, marginBottom:14 };
const boutonVert = { background:"linear-gradient(135deg,#43A047,#2E7D32)", color:"#fff", border:"none", borderRadius:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit" };

// Commune choisie par le visiteur, gardée sur cet appareil pour sa prochaine visite (simple confort)
const CLE_COMMUNE = "mg360_visiteur_commune";
const lireCommune = () => { try { return JSON.parse(localStorage.getItem(CLE_COMMUNE)) || null; } catch { return null; } };
const garderCommune = (c) => { try { localStorage.setItem(CLE_COMMUNE, JSON.stringify(c)); } catch { /* navigation privée */ } };

const jourParis = () => new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
const SAISONS = { 12:"hiver", 1:"hiver", 2:"hiver", 3:"printemps", 4:"printemps", 5:"printemps", 6:"ete", 7:"ete", 8:"ete", 9:"automne", 10:"automne", 11:"automne" };
const NOM_SAISON = { hiver:"d'hiver", printemps:"de printemps", ete:"d'été", automne:"d'automne" };

// Conseil de Bob du jour : même liste et même rotation que les notifications (api/notificationEngine.cjs)
function conseilDuJour() {
  const jour = jourParis(), mois = Number(jour.slice(5, 7));
  const liste = CONSEILS_BOB.filter(c => !c.mois || c.mois.includes(mois));
  return liste[Math.floor(Date.parse(jour) / 86400000) % liste.length];
}

export default function AccueilVisiteur() {
  const navigate = useNavigate();
  const code = codeRecu(); // arrivé par un lien de parrainage ou de créateur
  const ligue = periodeLigue();
  const saison = SAISONS[Number(jourParis().slice(5, 7))];
  const conseil = conseilDuJour();

  const [commune, setCommune] = useState(lireCommune);
  const [saisie, setSaisie] = useState(() => lireCommune()?.nom || "");
  const [suggestions, setSuggestions] = useState([]);
  const [meteo, setMeteo] = useState(null);
  const [etat, setEtat] = useState(""); // "" | "recherche" | "introuvable" | "erreur"
  const [articles, setArticles] = useState([]);

  // Haut d'entonnoir : le prospect (non connecté) voit l'accueil
  useEffect(() => { trackFunnelOncePerSession("landing_view"); }, []);

  // Articles Conseils de la saison (les plus récents d'abord), publiés dans /conseils.json
  useEffect(() => {
    fetch("/conseils.json").then(r => r.json())
      .then(liste => setArticles(liste.filter(a => a.saison === saison).reverse().slice(0, 3)))
      .catch(() => {});
  }, [saison]);

  // Météo du jour de la commune (même service que l'app : api/weather.js, sans les données Premium)
  useEffect(() => {
    if (!commune) return;
    setMeteo(null);
    fetch(`/api/weather?lat=${commune.lat}&lon=${commune.lon}&premium=false`).then(r => r.json())
      .then(d => setMeteo({ code: d.daily.weathercode[0], max: d.daily.temperature_2m_max[0], min: d.daily.temperature_2m_min[0] }))
      .catch(() => setEtat("erreur"));
  }, [commune]);

  const choisir = (c) => {
    setCommune(c); garderCommune(c); setSaisie(c.nom); setSuggestions([]); setEtat("");
  };

  const chercher = async (e) => {
    e?.preventDefault();
    if (saisie.trim().length < 2) return;
    setEtat("recherche"); setSuggestions([]);
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(saisie.trim())}&count=5&language=fr&format=json`);
      const res = ((await r.json()).results || []).map(x => ({ nom: x.name, detail: [x.admin1, x.country].filter(Boolean).join(", "), lat: x.latitude, lon: x.longitude }));
      if (!res.length) return setEtat("introuvable");
      setEtat("");
      if (res.length === 1) choisir(res[0]); else setSuggestions(res);
    } catch { setEtat("erreur"); }
  };

  const localiser = () => {
    if (!navigator.geolocation) return setEtat("erreur");
    setEtat("recherche");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      let nom = "Ma position";
      try {
        const d = await (await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`)).json();
        nom = d.address?.city || d.address?.town || d.address?.village || d.address?.municipality || nom;
      } catch { /* nom générique */ }
      choisir({ nom, lat: coords.latitude, lon: coords.longitude });
    }, () => setEtat(""));
  };

  const goEssai = (source) => { trackFunnel("cta_click", { source, dest: "essai" }); navigate("/essai"); };
  const goSignup = (source) => { trackFunnel("cta_click", { source, dest: "signup" }); navigate("/signup"); };
  const goSignin = (source) => { trackFunnel("cta_click", { source, dest: "signin" }); navigate("/login"); };
  const wmo = meteo ? getWMO(meteo.code) : null;

  return (
    <div style={{ background:G.bg, minHeight:"100vh", color:G.text, fontFamily:"'Nunito','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth:480, margin:"0 auto", padding:"0 16px 110px" }}>

        {/* ── En-tête ── */}
        <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 2px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <img src="/mg360-mascot-transparent.png" alt="Bob, la mascotte" style={{ width:38, height:38, objectFit:"contain" }} />
            <span style={{ fontSize:19, fontWeight:800, color:G.muted }}>Mongazon360<sup style={{ fontSize:9, marginLeft:1, color:G.soft }}>®</sup></span>
          </div>
          <button onClick={() => goSignin("header")} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(165,214,167,0.25)",
            color:"#e8f5e9", borderRadius:10, padding:"10px 14px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Se connecter
          </button>
        </header>

        {/* ── Code de parrainage ou créateur reçu par lien ── */}
        {code && (
          <div data-tuile="visiteur-code" role="button" onClick={() => goSignup("code")} style={{ ...carte, background:"linear-gradient(135deg,rgba(249,168,37,0.22),rgba(13,43,26,0.6))",
            border:"1px solid rgba(249,168,37,0.45)", cursor:"pointer", textAlign:"center" }}>
            <div style={{ fontSize:14, fontWeight:800, color:"#ffe082" }}>🎁 Code {code} : 1 mois de Premium offert</div>
            <div style={{ fontSize:12, color:G.muted, marginTop:3 }}>Crée ton compte, le mois offert s'active tout seul.</div>
          </div>
        )}

        {/* ── Ligue d'hiver : annoncée 7 jours avant le départ, puis jusqu'à fin janvier ── */}
        {ligue && ligue.statut !== "terminee" && (
          <div data-tuile="visiteur-ligue" role="button" onClick={() => goSignup("ligue_hiver")} style={{ ...carte, cursor:"pointer",
            background:"linear-gradient(135deg,rgba(100,181,246,0.18),rgba(13,43,26,0.6))", border:"1px solid rgba(144,202,249,0.4)" }}>
            <div style={{ fontSize:15, fontWeight:900, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span>❄️ Ligue d'hiver : 1 an de Premium à gagner</span><span style={{ fontSize:18 }}>→</span>
            </div>
            <div style={{ fontSize:12.5, fontWeight:700, marginTop:3, color:G.muted }}>
              {ligue.statut === "annonce" ? `Départ le dimanche ${dateLongue(ligue.debut)} : ` : ""}un défi et un quiz gazon par semaine, gratuits, jusqu'à fin janvier.
            </div>
          </div>
        )}

        {/* ── Météo du jour de sa commune ── */}
        <div data-tuile="visiteur-meteo" style={carte}>
          <form onSubmit={chercher}>
            <label htmlFor="commune" style={{ display:"block", fontSize:13, fontWeight:700, color:G.muted, marginBottom:8 }}>Ta pelouse aujourd'hui, à</label>
            <div style={{ display:"flex", gap:8 }}>
              <input id="commune" value={saisie} onChange={e => setSaisie(e.target.value)} placeholder="Ta commune" autoComplete="address-level2"
                style={{ flex:1, minWidth:0, height:44, boxSizing:"border-box", borderRadius:12, border:"1px solid rgba(165,214,167,0.35)",
                  background:"rgba(255,255,255,0.08)", color:G.text, fontFamily:"inherit", fontSize:15, padding:"0 12px" }} />
              <button type="submit" style={{ ...boutonVert, height:44, padding:"0 16px", fontSize:14 }}>Voir</button>
            </div>
          </form>
          {suggestions.length > 0 && (
            <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:6 }}>
              {suggestions.map(s => (
                <button key={`${s.lat},${s.lon}`} onClick={() => choisir(s)} style={{ textAlign:"left", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(165,214,167,0.2)",
                  borderRadius:10, padding:"9px 12px", color:G.text, fontFamily:"inherit", fontSize:13, cursor:"pointer" }}>
                  <b>{s.nom}</b> <span style={{ color:G.soft }}>{s.detail}</span>
                </button>
              ))}
            </div>
          )}
          {etat === "introuvable" && <div style={{ fontSize:12, color:"#ffcc80", marginTop:8 }}>Commune introuvable : vérifie l'orthographe.</div>}
          {etat === "erreur" && <div style={{ fontSize:12, color:"#ffcc80", marginTop:8 }}>Météo indisponible pour le moment, réessaie dans un instant.</div>}
          {commune && meteo && wmo ? (
            <div style={{ display:"flex", alignItems:"center", gap:14, marginTop:14 }}>
              <span style={{ fontSize:40 }} aria-hidden="true">{wmo.icon}</span>
              <div>
                <div style={{ fontSize:30, fontWeight:900, lineHeight:1 }}>{Math.round(meteo.max)}°<span style={{ fontSize:15, color:G.soft, fontWeight:700 }}> / {Math.round(meteo.min)}°</span></div>
                <div style={{ fontSize:13, color:G.muted, marginTop:3 }}>{wmo.label} à {commune.nom}</div>
              </div>
            </div>
          ) : !commune && (
            <button onClick={localiser} style={{ marginTop:10, background:"none", border:"none", color:G.accent, fontWeight:800, fontSize:13, cursor:"pointer", fontFamily:"inherit", padding:0 }}>
              📍 {etat === "recherche" ? "Recherche…" : "Utiliser ma position"}
            </button>
          )}
        </div>

        {/* ── Le conseil de Bob du jour ── */}
        <div data-tuile="visiteur-conseil-bob" style={{ ...carte, display:"flex", gap:12, alignItems:"flex-start" }}>
          <img src="/mg360-mascot-transparent.png" alt="" style={{ width:34, height:50, objectFit:"contain", flexShrink:0 }} />
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:G.muted, marginBottom:4 }}>Le conseil de Bob du jour</div>
            <div style={{ fontSize:14, lineHeight:1.5 }}>{conseil.body}</div>
          </div>
        </div>

        {/* ── Diagnostic photo d'essai ── */}
        <div data-tuile="visiteur-diagnostic" style={{ ...carte, padding:0, overflow:"hidden" }}>
          <img src="/gazon-avant.jpg" alt="Pelouse à diagnostiquer" style={{ width:"100%", height:130, objectFit:"cover", display:"block" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
          <div style={{ padding:"14px 16px 16px", display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ fontSize:16, fontWeight:800 }}>Diagnostic photo gratuit</div>
            <div style={{ fontSize:13, color:G.muted, lineHeight:1.5 }}>Bob note ta pelouse sur 100 et repère ce qui ne va pas. Un essai, sans compte.</div>
            <button onClick={() => goEssai("accueil_visiteur")} style={{ ...boutonVert, height:48, fontSize:15 }}>📸 Prendre une photo</button>
          </div>
        </div>

        {/* ── Conseils de saison (rubrique statique /conseils) ── */}
        <div data-tuile="visiteur-articles" style={{ ...carte, display:"flex", flexDirection:"column", gap:4 }}>
          <div style={{ fontSize:15, fontWeight:800, marginBottom:4 }}>Conseils {NOM_SAISON[saison]}</div>
          {articles.map(a => (
            <a key={a.slug} href={`/conseils/${a.slug}`} style={{ fontSize:14, lineHeight:1.45, color:G.muted, textDecoration:"none", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>{a.title}</a>
          ))}
          <a href="/conseils" style={{ fontSize:13, fontWeight:800, color:G.accent, textDecoration:"none", paddingTop:8 }}>Tous les conseils gazon →</a>
        </div>

        {/* ── Compte gratuit ── */}
        <div data-tuile="visiteur-compte-gratuit" style={{ ...carte, background:"linear-gradient(135deg,rgba(46,125,50,0.35),rgba(13,43,26,0.9))", border:"1px solid rgba(102,187,106,0.45)" }}>
          <div style={{ fontSize:16, fontWeight:900, marginBottom:8 }}>Avec un compte gratuit</div>
          {NIVEAUX.gratuit.avantages.map(a => <div key={a} style={{ fontSize:14, padding:"3px 0" }}>✔ {a}</div>)}
          <button onClick={() => goSignup("compte_gratuit")} style={{ width:"100%", height:50, marginTop:12, borderRadius:12, border:"none", background:"#e8f5e9", color:"#0d2b1a",
            fontFamily:"inherit", fontSize:15, fontWeight:900, cursor:"pointer" }}>Créer mon compte gratuit</button>
          <div style={{ fontSize:12, color:G.muted, textAlign:"center", marginTop:8, lineHeight:1.5 }}>
            Sans carte bancaire · 1 clic avec Google<br />et 7 jours de Premium offerts pour commencer
          </div>
        </div>

        {/* ── Pied de page ── */}
        <footer style={{ marginTop:28, paddingTop:18, borderTop:"1px solid rgba(165,214,167,0.14)", textAlign:"center" }}>
          <div style={{ display:"flex", gap:16, justifyContent:"center", flexWrap:"wrap", fontSize:12 }}>
            <a href="/mentions-legales" style={{ color:G.soft, textDecoration:"none" }}>Mentions légales</a>
            <a href="/confidentialite" style={{ color:G.soft, textDecoration:"none" }}>Confidentialité</a>
            <a href="/cgu" style={{ color:G.soft, textDecoration:"none" }}>CGU</a>
          </div>
          <div style={{ display:"flex", gap:16, justifyContent:"center", flexWrap:"wrap", fontSize:12, marginTop:10 }}>
            {RESEAUX.map(r => (
              <a key={r.nom} href={r.url} target="_blank" rel="me noopener" style={{ color:G.soft, textDecoration:"none" }}>{r.nom}</a>
            ))}
          </div>
          <div style={{ fontSize:10.5, color:G.faint, lineHeight:1.6, maxWidth:360, margin:"14px auto 0" }}>
            Mongazon360® est une marque déposée et enregistrée à l'EUIPO — protégée dans les 27 pays de l'Union européenne.
          </div>
        </footer>
      </div>
      <BarreVisiteur />
    </div>
  );
}
