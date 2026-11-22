// src/pages/ConseilsApp.jsx
// Conseils en mode app (chantier du 22/11 ; demandes de Jordan des 29 et 30/10/2026) : liste des articles (de saison
// d'abord) et lecture d'un article dans l'app, avec la barre du bas (visiteur : BarreVisiteur ; compte connecté : Layout).
// Contenu chargé à la demande (src/lib/conseilsApp.js). Encarts de l'app : pour un visiteur, les 3 des pages web, aux mêmes
// places et avec leurs textes (lien balisé « encart=lire-<thème>-<position> ») ; pour un compte connecté, un seul, à la fin
// de l'article (décision de Jordan du 9/11), qui ouvre la fonction du thème principal (« appli » de
// src/lib/argumentsApp.json). Pages non indexées (vercel.json et
// usePageMeta : adresse canonique = page web /conseils de l'article).
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BarreVisiteur from "../components/BarreVisiteur";
import ARGUMENTS from "../lib/argumentsApp.json";
import { chargerListe, chargerArticle, trier, saisonDe, jourParis, estNouveau, NOMS_SAISONS, dateLongue } from "../lib/conseilsApp";

const THEMES = Object.fromEntries(ARGUMENTS.themes.map(t => [t.id, t]));
const PAGES_WEB = ["/a-propos", "/partenaires"]; // pages statiques hors de l'app : chargement complet

const C = { text: "#F1F8F2", muted: "#A5D6A7", soft: "#81C784", faint: "#4a7c5c", accent: "#66BB6A" };
const carte = { display: "block", width: "100%", boxSizing: "border-box", textAlign: "left", fontFamily: "inherit", color: "inherit",
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(165,214,167,0.18)", borderRadius: 16, padding: 14, marginBottom: 10 };
const encadre = { ...carte, display: "flex", gap: 12, margin: "18px 0", background: "rgba(102,187,106,0.10)", border: "1px solid rgba(102,187,106,0.35)" };
const boutonVert = { background: "linear-gradient(135deg,#43A047,#2E7D32)", color: "#fff", border: "none", borderRadius: 12, padding: "10px 16px",
  fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" };
const nouveau = { fontSize: 10, fontWeight: 800, color: "#0F2F1F", background: C.accent, borderRadius: 6, padding: "2px 6px", marginLeft: 6, verticalAlign: "middle" };
const titrePartie = { fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: C.soft, margin: "20px 2px 10px" };

// Texte des articles (HTML des fichiers Markdown)
const CSS = `
.lecture{font-size:16px;line-height:1.65;color:#F1F8F2;overflow-wrap:anywhere}
.lecture h2{font-size:19px;line-height:1.3;margin:26px 0 8px;color:#fff}
.lecture h3{font-size:16px;margin:20px 0 6px;color:#E8F5E9}
.lecture p{margin:0 0 12px}
.lecture ul,.lecture ol{margin:0 0 12px;padding-left:22px}
.lecture li{margin:4px 0}
.lecture a{color:#A5D6A7;text-decoration:underline}
.lecture strong{color:#fff}
.lecture blockquote{margin:14px 0;padding:12px 14px;border-left:4px solid #66BB6A;background:rgba(102,187,106,0.12);border-radius:0 12px 12px 0}
.lecture blockquote p:last-child{margin-bottom:0}
.lecture table{display:block;max-width:100%;overflow-x:auto;border-collapse:collapse;margin:0 0 14px;font-size:14px;overflow-wrap:normal}
.lecture th,.lecture td{border:1px solid rgba(165,214,167,0.25);padding:6px 8px;text-align:left;vertical-align:top}
.lecture th{background:rgba(255,255,255,0.06)}
.lecture img{max-width:100%;height:auto;border-radius:12px}
.lecture hr{border:0;border-top:1px solid rgba(165,214,167,0.2);margin:20px 0}`;

// Encart de l'app (thème du catalogue) : position haut, milieu ou fin
function Encart({ id, position, visiteur }) {
  const navigate = useNavigate();
  const t = THEMES[id];
  const tuile = `lire-encart-${id}-${position}`;
  if (visiteur) {
    const lien = `${t.cible}${t.cible.includes("?") ? "&" : "?"}encart=lire-${id}-${position}`;
    return (
      <aside data-tuile={tuile} style={encadre}>
        <span aria-hidden="true" style={{ fontSize: 26, lineHeight: 1 }}>{t.icone}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1.35 }}>{t.titre}</div>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.5, margin: "6px 0 10px" }}>{t.texte}</p>
          <button onClick={() => navigate(lien)} style={boutonVert}>{t.bouton}</button>
          {t.mention && (
            <button onClick={() => navigate(t.mention.lien)} style={{ display: "block", marginTop: 8, background: "none", border: "none", padding: 0,
              color: C.soft, fontSize: 11, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit" }}>{t.mention.texte}</button>
          )}
        </div>
      </aside>
    );
  }
  const ouvrir = () => (t.appli === "bob" ? window.dispatchEvent(new Event("mg360:ouvrir-bob")) : navigate(t.appli));
  return (
    <button data-tuile={tuile} onClick={ouvrir} style={{ ...encadre, alignItems: "center", cursor: "pointer" }}>
      <span aria-hidden="true" style={{ fontSize: 24, lineHeight: 1 }}>{t.icone}</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: "#fff" }}>{t.court}</span>
        <span style={{ display: "block", fontSize: 13, color: C.muted, lineHeight: 1.4 }}>{t.ligne}</span>
      </span>
      <span style={{ fontSize: 13, fontWeight: 800, color: C.accent, whiteSpace: "nowrap" }}>Ouvrir ›</span>
    </button>
  );
}

function CarteArticle({ a, jour, tuile }) {
  const navigate = useNavigate();
  return (
    <button data-tuile={tuile} onClick={() => navigate(`/lire/${a.slug}`)} style={{ ...carte, cursor: "pointer" }}>
      <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1.35 }}>
        {a.title}{estNouveau(a, jour) && <span style={nouveau}>Nouveau</span>}
      </span>
      <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 13,
        color: C.muted, lineHeight: 1.45, marginTop: 4 }}>{a.description}</span>
    </button>
  );
}

const Attente = ({ texte }) => <p style={{ color: C.soft, fontSize: 14, textAlign: "center", padding: "40px 0" }}>{texte}</p>;

function Liste() {
  const [liste, setListe] = useState(null);
  const [erreur, setErreur] = useState(false);
  useEffect(() => { chargerListe().then(setListe).catch(() => setErreur(true)); }, []);
  if (erreur) return <Attente texte="Les conseils n'ont pas pu être chargés. Vérifiez votre connexion et réessayez." />;
  if (!liste) return <Attente texte="Chargement des conseils…" />;
  const jour = jourParis(), saison = saisonDe(jour);
  const tries = trier(liste, jour);
  return (
    <>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "18px 2px 4px" }}>📚 Conseils gazon</h1>
      <p style={{ fontSize: 14, color: C.muted, margin: "0 2px" }}>Nos guides saison par saison : tonte, arrosage, mousse, semis…</p>
      <div style={titrePartie}>{NOMS_SAISONS[saison]} : les conseils du moment</div>
      {tries.filter(a => a.saison === saison).map(a => <CarteArticle key={a.slug} a={a} jour={jour} tuile="lire-liste-saison" />)}
      <div style={titrePartie}>Tous les autres conseils</div>
      {tries.filter(a => a.saison !== saison).map(a => <CarteArticle key={a.slug} a={a} jour={jour} tuile="lire-liste-autres" />)}
    </>
  );
}

function Article({ slug, visiteur }) {
  const navigate = useNavigate();
  const [a, setA] = useState(null);
  const [erreur, setErreur] = useState(false);
  useEffect(() => {
    let actif = true;
    setA(null); setErreur(false); window.scrollTo(0, 0);
    chargerArticle(slug).then(d => actif && setA(d)).catch(() => actif && setErreur(true));
    return () => { actif = false; };
  }, [slug]);
  useEffect(() => { if (a) document.title = `${a.title} — Mongazon360®`; }, [a]);

  // Liens du texte : articles et pages de l'app ouverts dans l'app, pages web statiques en chargement complet
  const clic = (e) => {
    const lien = e.target instanceof Element ? e.target.closest("a[href]") : null;
    if (!lien || lien.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || lien.getAttribute("href").startsWith("#")) return;
    const url = new URL(lien.getAttribute("href"), window.location.origin);
    if (url.origin !== window.location.origin) return;
    e.preventDefault();
    const article = url.pathname.match(/^\/conseils(?:\/([a-z0-9-]+))?\/?$/);
    if (article) return navigate(article[1] ? `/lire/${article[1]}` : "/lire");
    if (PAGES_WEB.some(p => url.pathname.startsWith(p))) return window.location.assign(url.href);
    navigate(url.pathname + url.search + url.hash);
  };

  if (erreur) return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <p style={{ color: C.muted, fontSize: 15 }}>Cet article n'a pas pu être chargé.</p>
      <button onClick={() => navigate("/lire")} style={boutonVert}>Voir tous les conseils</button>
    </div>
  );
  if (!a) return <Attente texte="Chargement de l'article…" />;
  const jour = jourParis();
  const themes = a.themes.filter(id => THEMES[id] && (!THEMES[id].fin || THEMES[id].fin >= jour));
  const [debut, suite, fin] = a.parties;
  const themeFin = visiteur ? themes[2] : themes[0]; // compte connecté : un seul encart, le thème principal de l'article
  const texte = (html) => <div className="lecture" onClick={clic} dangerouslySetInnerHTML={{ __html: html }} />;
  return (
    <article>
      <button onClick={() => navigate("/lire")} style={{ background: "none", border: "none", color: C.muted, fontSize: 14, fontWeight: 700,
        padding: "16px 0 6px", cursor: "pointer", fontFamily: "inherit" }}>‹ Conseils gazon</button>
      <h1 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.25, margin: "4px 0 6px" }}>{a.title}</h1>
      <div style={{ fontSize: 12, color: C.soft, marginBottom: 12 }}>{NOMS_SAISONS[a.saison]} · Mis à jour le {dateLongue(a.maj)}</div>
      {a.image && <img src={a.image} alt={a.image_alt || ""} width="1200" height="800"
        style={{ width: "100%", height: "auto", borderRadius: 14, margin: "0 0 12px" }} />}
      {texte(debut)}
      {visiteur && themes[0] && <Encart id={themes[0]} position="haut" visiteur />}
      {texte(suite)}
      {visiteur && fin !== undefined && themes[1] && <Encart id={themes[1]} position="milieu" visiteur />}
      {fin !== undefined && texte(fin)}
      {themeFin && <Encart id={themeFin} position="fin" visiteur={visiteur} />}
      {a.autres.length > 0 && (
        <>
          <div style={titrePartie}>À lire aussi</div>
          {a.autres.map(o => <CarteArticle key={o.slug} a={o} jour={jour} tuile="lire-a-lire-aussi" />)}
        </>
      )}
    </article>
  );
}

export default function ConseilsApp({ visiteur = false }) {
  const { slug } = useParams();
  const contenu = (
    <div style={{ padding: visiteur ? "0 16px 110px" : "0 16px 8px" }}>
      <style>{CSS}</style>
      {slug ? <Article slug={slug} visiteur={visiteur} /> : <Liste />}
    </div>
  );
  if (!visiteur) return contenu; // compte connecté : dans le Layout (barre de l'app, Bob)
  return (
    <div style={{ background: "linear-gradient(165deg,#0F2F1F 0%,#164a2b 45%,#0d2519 100%)", minHeight: "100vh", color: C.text,
      fontFamily: "'Nunito','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>{contenu}</div>
      <BarreVisiteur />
    </div>
  );
}
