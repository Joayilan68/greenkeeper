// scripts/conseils-template.mjs — gabarit HTML statique de la rubrique « Conseils gazon »
// (pages complètes sans JavaScript : lisibles par Google et par les aperçus de partage).
import { readFileSync } from "node:fs";
import { ROBOT_UA } from "../src/lib/platform.js";
import { RESEAUX } from "../src/lib/reseaux.js";
const SITE = "https://mongazon360.fr";
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const CSS = `
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#1f2d24;background:#f6f8f4;line-height:1.7}
a{color:#2e7d32}header{background:#1a4731;color:#fff}.bar{max-width:760px;margin:0 auto;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.logo{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;font-weight:800;font-size:18px}.logo img{width:32px;height:32px;border-radius:8px}
.logo sup{font-size:10px}.btn{background:#43a047;color:#fff;text-decoration:none;font-weight:700;padding:9px 16px;border-radius:10px;font-size:14px;white-space:nowrap}
main{max-width:760px;margin:0 auto;padding:24px 20px 40px}.crumb{font-size:13px;color:#5b6f61;margin-bottom:8px}.crumb a{color:#5b6f61}
h1{font-size:32px;line-height:1.2;margin:8px 0 12px;color:#1a4731}h2{font-size:23px;line-height:1.3;margin:34px 0 10px;color:#1a4731}h3{font-size:18px;margin:24px 0 8px;color:#1a4731}
.meta{font-size:13px;color:#5b6f61;margin-bottom:24px}article p,article li{font-size:17px}article ul,article ol{padding-left:22px}
article table{border-collapse:collapse;width:100%;margin:16px 0;font-size:15px}article th,article td{border:1px solid #d7e3d9;padding:8px 10px;text-align:left}article th{background:#e8f5e9}
blockquote{margin:18px 0;padding:12px 16px;background:#e8f5e9;border-left:4px solid #43a047;border-radius:6px}blockquote p{margin:0}
.cta{margin:36px 0;padding:22px;border-radius:16px;background:#1a4731;color:#e8f5e9;text-align:center}.cta strong{display:block;font-size:20px;color:#fff;margin-bottom:6px}
.cta .btn{display:inline-block;margin-top:14px;font-size:16px;padding:12px 22px}.cards{display:grid;gap:12px}
.shop{margin:32px 0 0;padding:18px;border:1px solid #dfe8e1;border-radius:16px;background:#fff}.shop h2{margin:0 0 4px;font-size:19px}
.shop a{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid #eef3ef;text-decoration:none;color:#1f2d24;font-size:15px}
.shop a span:last-child{white-space:nowrap;color:#2e7d32;font-weight:700}.shop .kit{margin:10px 0 0;font-size:14px}.shop small{display:block;font-size:12px;color:#5b6f61;margin-top:8px;line-height:1.5}
article img{max-width:100%;height:auto;border-radius:12px;display:block}.hero{margin:0 0 22px}figure{margin:22px 0}
.duo{display:grid;grid-template-columns:1fr 1fr;gap:8px}figcaption{grid-column:1/-1;font-size:13px;color:#5b6f61;margin-top:4px}
.card{display:block;background:#fff;border:1px solid #dfe8e1;border-radius:14px;padding:16px;text-decoration:none;color:#1f2d24}.card b{color:#1a4731;font-size:17px}
.card span{display:block;font-size:14px;color:#5b6f61;margin-top:4px}.season{font-size:12px;font-weight:700;color:#2e7d32;text-transform:uppercase;letter-spacing:.06em;margin:26px 0 8px}
footer{border-top:1px solid #dfe8e1;background:#fff}footer div{max-width:760px;margin:0 auto;padding:18px 20px;font-size:12px;color:#5b6f61}footer a{color:#5b6f61;margin-right:12px}
@media(max-width:520px){h1{font-size:26px}.bar .btn{padding:8px 12px;font-size:13px}}`;

// Liens vers l'essai gratuit balisés : l'inscription est attribuée à la source « conseils »
// (et à l'article d'origine) dans Pilotage → Activité, au lieu de « autre ».
const essai = (campagne) => `/essai?utm_source=conseils&amp;utm_medium=article&amp;utm_campaign=${campagne}`;

// Mesure d'audience des pages Conseils (même logique que l'app, sans cookie ni donnée personnelle) :
// 1. origine du visiteur conservée jusqu'à l'inscription : même clé sessionStorage que useUTMCapture
//    (utm_source, sinon site d'origine ; campagne = utm_campaign, sinon l'article) ;
// 2. page lue comptée dans funnel_events (« conseils_vue », 1 par page et par onglet) avec l'identifiant de visite de l'app
//    (sessionStorage « mg360_visite ») : relie la lecture d'un article à l'entrée dans l'app au cours de la même visite ;
// 3. visite comptée dans site_visits (1 par appareil et par jour, clé partagée avec l'app, comptes
//    connectés et robots exclus) si l'URL et la clé publique Supabase sont fournies au build.
const SUPABASE_URL  = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || "";
if (!SUPABASE_URL || !SUPABASE_ANON) console.warn("[seo] Supabase non configuré : visites des pages Conseils non comptées");

const suivi = (campagne) => `<script>(function(){try{
var p=new URLSearchParams(location.search),ref=document.referrer||"",K="mg360_utm_capture",src=(p.get("utm_source")||"").toLowerCase().trim();
if(!src){src="direct";var m=[[/instagram\\./i,"instagram"],[/tiktok\\./i,"tiktok"],[/facebook\\.|fb\\.com/i,"facebook"],[/(twitter|x)\\.com/i,"twitter"],[/youtube\\.|youtu\\.be/i,"youtube"],[/pinterest|pin\\.it/i,"pinterest"],[/linkedin\\./i,"linkedin"],[/google\\.|bing\\.|duckduckgo\\./i,"google"],[/mail\\.|gmail|outlook|yahoo/i,"email"]];
if(ref&&!/mongazon360\\./i.test(ref)){src="autre";for(var i=0;i<m.length;i++)if(m[i][0].test(ref)){src=m[i][1];break;}}}
var cap=null;try{cap=JSON.parse(sessionStorage.getItem(K));}catch(e){}
if(!cap){cap={source:src,medium:p.get("utm_medium")||"conseils",campaign:p.get("utm_campaign")||"${campagne}",referer:ref,landingPath:location.pathname+location.search,capturedAt:new Date().toISOString()};sessionStorage.setItem(K,JSON.stringify(cap));}
var U="${SUPABASE_URL}",A="${SUPABASE_ANON}",d=new Date().toLocaleDateString("fr-CA"),V="mg360_visit_"+d;
if(!U||!A||/__client_uat=[1-9]/.test(document.cookie)||navigator.webdriver||${ROBOT_UA}.test(navigator.userAgent))return;
var H={apikey:A,Authorization:"Bearer "+A,"Content-Type":"application/json",Prefer:"return=minimal"},vis=null,L="mg360_conseils_"+location.pathname;
try{vis=sessionStorage.getItem("mg360_visite");if(!vis){vis=window.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);sessionStorage.setItem("mg360_visite",vis);}
if(!sessionStorage.getItem(L)){sessionStorage.setItem(L,"1");
fetch(U+"/rest/v1/funnel_events",{method:"POST",headers:H,body:JSON.stringify({step:"conseils_vue",meta:{page:"${campagne}",source:String(cap.source).slice(0,40)},path:location.pathname,visite:vis})}).catch(function(){});}}catch(e){}
if(localStorage.getItem(V))return;
localStorage.setItem(V,"1");
var ua=navigator.userAgent||"",ios=/iPhone|iPad|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1);
fetch(U+"/rest/v1/site_visits",{method:"POST",headers:H,
body:JSON.stringify({path:location.pathname,os:ios?"ios":/Android/i.test(ua)?"android":"ordinateur",installed:matchMedia("(display-mode: standalone)").matches,source:String(cap.source).slice(0,40),campaign:cap.campaign?String(cap.campaign).slice(0,80):null})}).catch(function(){});
}catch(e){}})();</script>`;

const SAISONS = { automne: "🍂 Automne", hiver: "❄️ Hiver", printemps: "🌱 Printemps", ete: "☀️ Été" };
const frDate = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// Image de partage : photo de l'article (1200 × 800) si elle existe, sinon l'image générale du site
const IMAGE_SITE = { src: "/og-image.jpg", largeur: 1200, hauteur: 630 };

// style : CSS propre à la page. pro : page destinée aux professionnels, bouton d'en-tête vers son formulaire (#demande)
// et sans la mesure d'audience de l'app (site_visits, conseils_vue), pour ne pas fausser la mesure de la refonte.
function page({ title, description, path, ogType, jsonLd, body, campagne, image = IMAGE_SITE, style = "", pro = false }) {
  const url = SITE + path;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<link rel="canonical" href="${url}" />
<link rel="icon" href="/favicon.ico" sizes="48x48" />
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
<meta property="og:type" content="${ogType}" />
<meta property="og:url" content="${url}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${SITE}${image.src}" />
<meta property="og:image:width" content="${image.largeur}" />
<meta property="og:image:height" content="${image.hauteur}" />
<meta property="og:locale" content="fr_FR" />
<meta property="og:site_name" content="Mongazon360®" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${SITE}${image.src}" />
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>${CSS}${style}</style>
<script defer src="/_vercel/insights/script.js"></script>
</head>
<body>
<header><div class="bar"><a class="logo" href="/"><img src="/icon-192.png" alt="" />Mongazon360<sup>®</sup></a>${pro
  ? `<a class="btn" href="#demande">Devenir partenaire</a>` : `<a class="btn" href="${essai(campagne)}">Diagnostic gratuit</a>`}</div></header>
<main>${body}</main>
${pro ? "" : suivi(campagne)}
<footer><div><a href="/conseils">Conseils gazon</a><a href="/a-propos">Qui sommes-nous</a><a href="/mentions-legales">Mentions légales</a><a href="/confidentialite">Confidentialité</a><a href="/cookies">Cookies</a><br />Suivez-nous : ${RESEAUX.map(r => `<a href="${esc(r.url)}" rel="me noopener" target="_blank">${r.nom}</a>`).join("")}<br />© ${new Date().getFullYear()} Mongazon360® — marque déposée et enregistrée à l'EUIPO</div></footer>
</body>
</html>
`;
}

const cta = (campagne) => `<div class="cta"><strong>Votre gazon mérite un vrai diagnostic</strong>Prenez votre pelouse en photo : Bob repère mousse, carences et maladies, et vous dit quoi faire selon votre météo.<br /><a class="btn" href="${essai(campagne)}">Essayer gratuitement</a></div>`;

// Encadré « Le matériel conseillé » : catégories du catalogue listées dans l'en-tête de l'article
// (produits: engraisAutomne, antiMousse), 3 gammes par catégorie et 4 produits au plus, liens partenaires Amazon,
// et renvoi vers le kit de saison de l'app
function encadreProduits(cles, produits, campagne) {
  const lignes = cles.flatMap(cle => Object.values(produits[cle]?.tiers || {}).slice(0, 3)).slice(0, 4);
  if (!lignes.length) return "";
  const prix = (n) => `${Number(n).toFixed(2).replace(".", ",")} €`;
  return `<div class="shop"><h2>🛒 Le matériel conseillé</h2>${lignes.map(p =>
    `<a href="${esc(p.url)}" target="_blank" rel="sponsored noopener noreferrer"><span>${esc(p.label)} — ${esc(p.marque)}</span><span>~${prix(p.prix)}</span></a>`).join("")}
<p class="kit">📱 Dans l'app Mongazon360 : le <b>kit de saison</b> calculé pour votre surface et votre budget. <a href="${essai(campagne)}">Essayer l'app gratuitement</a></p>
<small>Liens partenaires Amazon : en tant que Partenaire Amazon, Mongazon360® perçoit une commission sur les achats éligibles, sans surcoût pour vous. Prix indicatifs.</small></div>`;
}

// Photo d'article (en-tête « image » et « image_alt ») : public/images/conseils, 1200 × 800 px, sans métadonnées
export function articlePage(a, autres, produits = {}) {
  const path = `/conseils/${a.slug}`;
  const image = a.image ? { src: a.image, largeur: 1200, hauteur: 800 } : IMAGE_SITE;
  const jsonLd = { "@context": "https://schema.org", "@graph": [
    { "@type": "Article", headline: a.title, description: a.description, image: `${SITE}${image.src}`,
      datePublished: a.date, dateModified: a.maj || a.date, inLanguage: "fr",
      author: { "@type": "Organization", name: "Mongazon360", url: `${SITE}/a-propos` },
      publisher: { "@type": "Organization", name: "Mongazon360", logo: { "@type": "ImageObject", url: `${SITE}/icon-512x512.png` } },
      mainEntityOfPage: `${SITE}${path}` },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Conseils gazon", item: `${SITE}/conseils` },
      { "@type": "ListItem", position: 3, name: a.title, item: `${SITE}${path}` } ] } ] };
  const lies = autres.length ? `<h2>À lire aussi</h2><div class="cards">${autres.map(o =>
    `<a class="card" href="/conseils/${o.slug}"><b>${esc(o.title)}</b><span>${esc(o.description)}</span></a>`).join("")}</div>` : "";
  const body = `<div class="crumb"><a href="/">Accueil</a> › <a href="/conseils">Conseils gazon</a></div>
<article><h1>${esc(a.title)}</h1><div class="meta">${SAISONS[a.saison] || ""} · Mis à jour le ${frDate(a.maj || a.date)} · Par <a href="/a-propos">l'équipe Mongazon360</a></div>
${a.image ? `<img class="hero" src="${esc(a.image)}" alt="${esc(a.image_alt)}" width="1200" height="800" fetchpriority="high" />` : ""}
${a.html}</article>${encadreProduits(a.produits ? a.produits.split(",").map(x => x.trim()) : [], produits, a.slug)}${cta(a.slug)}${lies}`;
  return page({ title: `${a.title} — Mongazon360®`, description: a.description, path, ogType: "article", jsonLd, body, campagne: a.slug, image });
}

// Page « Qui sommes-nous » (content/a-propos.md) : qui édite Mongazon360 et d'où viennent ses conseils
export function aProposPage(html) {
  const jsonLd = { "@context": "https://schema.org", "@type": "AboutPage", name: "Qui sommes-nous", url: `${SITE}/a-propos`,
    inLanguage: "fr", about: { "@type": "Organization", name: "Mongazon360", url: SITE, email: "contact@mongazon360.fr",
      logo: `${SITE}/icon-512x512.png`, founder: { "@type": "Person", name: "Jordan" }, sameAs: RESEAUX.map(r => r.url) } };
  const body = `<div class="crumb"><a href="/">Accueil</a> › Qui sommes-nous</div><article>${html}</article>${cta("a-propos")}`;
  return page({ title: "Qui sommes-nous ? — Mongazon360®",
    description: "Mongazon360, application française d'entretien du gazon : qui l'édite, comment sont construits ses conseils et sa base agronomique, comment nous contacter.",
    path: "/a-propos", ogType: "website", jsonLd, body, campagne: "a-propos" });
}

export function indexPage(articles) {
  const jsonLd = { "@context": "https://schema.org", "@type": "CollectionPage", name: "Conseils gazon", url: `${SITE}/conseils`, inLanguage: "fr" };
  const groupes = Object.entries(SAISONS).map(([k, label]) => {
    const liste = articles.filter(a => a.saison === k);
    return liste.length ? `<div class="season">${label}</div><div class="cards">${liste.map(a =>
      `<a class="card" href="/conseils/${a.slug}"><b>${esc(a.title)}</b><span>${esc(a.description)}</span></a>`).join("")}</div>` : "";
  }).join("");
  const body = `<h1>Conseils gazon</h1><p>Tonte, arrosage, semis, mousse, engrais : les bons gestes au bon moment, expliqués simplement par l'équipe Mongazon360.</p>${groupes}${cta("rubrique")}`;
  return page({ title: "Conseils gazon : entretien de la pelouse saison par saison — Mongazon360®",
    description: "Guides pratiques pour une belle pelouse toute l'année : regarnissage, scarification, mousse, engrais, tonte et arrosage, saison par saison.",
    path: "/conseils", ogType: "website", jsonLd, body, campagne: "rubrique" });
}

// ── Page « Devenir partenaire » (paysagistes, jardiniers ; décision de Jordan du 31/10/2026) ─────────────────────────
// Formulaire envoyé à /api/send?type=partenaire (api/partenaires.cjs : email à contact@, accusé de réception) ; origine
// = utm_source et utm_campaign de l'adresse (sinon origine notée par une page Conseils lue avant, sinon site d'origine) ;
// vue de la page comptée dans funnel_events (« partenaires_vue », 1 par onglet, robots exclus).
const SERVICES_PARTENAIRES = JSON.parse(readFileSync(new URL("../src/lib/servicesPartenaires.json", import.meta.url), "utf8"));
const CSS_PARTENAIRES = `
[hidden]{display:none!important}.intro{font-size:18px}.etapes{counter-reset:e;list-style:none;padding:0}
.etapes li{position:relative;padding:0 0 14px 46px}.etapes li::before{counter-increment:e;content:counter(e);position:absolute;left:0;top:0;width:32px;height:32px;border-radius:50%;background:#43a047;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center}
.form{display:grid;gap:14px;background:#fff;border:1px solid #dfe8e1;border-radius:16px;padding:20px}.form label{display:grid;gap:4px;font-size:15px;font-weight:600;color:#1a4731}
.form small{font-weight:400;color:#5b6f61}.form input,.form select,.form textarea{font:inherit;font-size:16px;font-weight:400;padding:10px 12px;border:1px solid #c9d8cc;border-radius:10px;background:#fff;color:#1f2d24;width:100%}
.form .duo2{display:grid;grid-template-columns:1fr 1fr;gap:14px}.form fieldset{border:1px solid #dfe8e1;border-radius:12px;padding:10px 14px;margin:0}
.form legend{font-size:15px;font-weight:600;color:#1a4731;padding:0 4px}.form .case{display:flex;align-items:center;gap:10px;font-weight:400;color:#1f2d24;padding:3px 0}
.form .case input{width:20px;height:20px;flex:none;margin:0}.form .piege{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.rgpd{font-size:13px;color:#5b6f61;margin:0}.form button{border:0;cursor:pointer;font-size:16px;padding:13px 22px;justify-self:start}.form button:disabled{opacity:.6}
.etat{margin:0;font-size:15px;color:#b3261e}.merci{padding:20px;border-radius:16px;background:#e8f5e9;border:1px solid #a5d6a7;font-size:17px}
@media(max-width:520px){.form .duo2{grid-template-columns:1fr}}`;

const scriptPartenaires = () => `<script>(function(){
var f=document.getElementById("demande-form"),etat=f.querySelector(".etat"),bouton=f.querySelector("button"),ouvert=Date.now();
var p=new URLSearchParams(location.search),ref=document.referrer||"",cap=null;
try{cap=JSON.parse(sessionStorage.getItem("mg360_utm_capture"));}catch(e){}
var source=String(p.get("utm_source")||(cap&&cap.source)||(/facebook\\.|fb\\.com/i.test(ref)?"facebook":/google\\.|bing\\.|duckduckgo\\./i.test(ref)?"google":ref&&!/mongazon360\\./i.test(ref)?"autre":"direct")).toLowerCase().slice(0,40);
var campagne=String(p.get("utm_campaign")||(cap&&cap.campaign)||"").slice(0,80)||null;
var U="${SUPABASE_URL}",A="${SUPABASE_ANON}";
try{if(U&&A&&!navigator.webdriver&&!${ROBOT_UA}.test(navigator.userAgent)&&!sessionStorage.getItem("mg360_partenaires_vue")){sessionStorage.setItem("mg360_partenaires_vue","1");
fetch(U+"/rest/v1/funnel_events",{method:"POST",headers:{apikey:A,Authorization:"Bearer "+A,"Content-Type":"application/json",Prefer:"return=minimal"},
body:JSON.stringify({step:"partenaires_vue",meta:{source:source,campagne:campagne},path:location.pathname})}).catch(function(){});}}catch(e){}
f.addEventListener("submit",function(ev){ev.preventDefault();
var d=new FormData(f),corps={services:d.getAll("services"),source:source,campagne:campagne,duree:Date.now()-ouvert};
["entreprise","siret","contact","email","telephone","code_postal","rayon_km","message","piege"].forEach(function(k){corps[k]=String(d.get(k)||"").trim();});
if(!corps.services.length){etat.textContent="Cochez au moins un service.";return;}
bouton.disabled=true;etat.textContent="Envoi en cours…";
fetch("/api/send?type=partenaire",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(corps)})
.then(function(r){return r.json().catch(function(){return {};}).then(function(j){if(!r.ok||!j.ok)throw new Error(j.error||"");});})
.then(function(){var m=document.getElementById("merci");f.hidden=true;m.hidden=false;m.scrollIntoView({block:"center"});})
.catch(function(e){bouton.disabled=false;etat.textContent=e.message||"L'envoi n'a pas abouti. Réessayez dans un instant ou écrivez-nous à contact@mongazon360.fr.";});
});})();</script>`;

export function partenairesPage() {
  const description = "Paysagistes, jardiniers : recevez les demandes de travaux des particuliers de votre secteur avec Mongazon360. Paiement au contact reçu, puis commission au contrat signé.";
  const jsonLd = { "@context": "https://schema.org", "@type": "WebPage", name: "Devenir partenaire Mongazon360", url: `${SITE}/partenaires`,
    inLanguage: "fr", description, publisher: { "@type": "Organization", name: "Mongazon360", url: SITE, email: "contact@mongazon360.fr",
      logo: `${SITE}/icon-512x512.png` } };
  const champ = (nom, libelle, attributs = "") => `<label><span>${libelle}</span><input name="${nom}" ${attributs} /></label>`;
  const body = `<div class="crumb"><a href="/">Accueil</a> › Professionnels</div>
<article><h1>Paysagistes, jardiniers : recevez des demandes de travaux près de chez vous</h1>
<p class="intro">Mongazon360 est une application française qui aide les particuliers à entretenir leur pelouse : diagnostic photo, conseils selon la météo de leur commune, plan d'entretien saison par saison.</p>
<p>Au printemps 2027, l'app ouvre <b>« Trouver un pro »</b> : quand un chantier dépasse ce qu'ils peuvent faire eux-mêmes, nos utilisateurs demandent un professionnel de leur secteur. <b>Nous choisissons dès maintenant les entreprises qui recevront ces demandes.</b></p>
<h2>Comment ça marche</h2>
<ol class="etapes"><li><b>Vous présentez votre entreprise</b> avec le formulaire ci-dessous : vos services, votre zone d'intervention, vos coordonnées.</li>
<li><b>Nous vous répondons sous 2 jours ouvrés</b>, avec nos conditions et nos tarifs.</li>
<li><b>Vous recevez les demandes de votre secteur</b> qui correspondent à vos services, avec le besoin du client et sa commune.</li></ol>
<h2>Nos conditions</h2>
<ul><li><b>Vous payez les contacts reçus</b> : chaque demande qui vous est transmise est facturée.</li>
<li><b>Puis une commission sur les contrats signés</b> avec ces clients.</li>
<li>Le détail de nos tarifs vous est envoyé avec notre réponse.</li></ul>
<h2 id="demande">Devenir partenaire</h2>
<form id="demande-form" class="form">
${champ("entreprise", "Entreprise *", 'required maxlength="120" autocomplete="organization"')}
${champ("siret", "SIRET <small>(facultatif)</small>", 'inputmode="numeric" maxlength="17" pattern="[0-9 ]{14,17}"')}
${champ("contact", "Nom de la personne à contacter *", 'required maxlength="80" autocomplete="name"')}
<div class="duo2">${champ("email", "Email *", 'type="email" required maxlength="120" autocomplete="email"')}
${champ("telephone", "Téléphone *", 'type="tel" required minlength="10" maxlength="20" autocomplete="tel"')}</div>
<div class="duo2">${champ("code_postal", "Code postal de l'entreprise *", 'required inputmode="numeric" maxlength="5" pattern="[0-9]{5}" autocomplete="postal-code"')}
<label><span>Rayon d'intervention</span><select name="rayon_km"><option value="">Choisir</option>${[10, 20, 30, 50, 80, 100].map(km => `<option value="${km}">${km} km</option>`).join("")}</select></label></div>
<fieldset><legend>Services proposés *</legend>${Object.entries(SERVICES_PARTENAIRES).map(([cle, libelle]) =>
    `<label class="case"><input type="checkbox" name="services" value="${cle}" />${esc(libelle)}</label>`).join("")}</fieldset>
<label><span>Votre message <small>(facultatif)</small></span><textarea name="message" rows="4" maxlength="1500" placeholder="Votre activité, votre équipe, vos disponibilités…"></textarea></label>
<label class="piege" aria-hidden="true">Ne pas remplir<input name="piege" tabindex="-1" autocomplete="off" /></label>
<p class="rgpd">Vos informations servent uniquement à étudier votre demande et à vous répondre. Elles sont conservées 3 ans au plus. <a href="/confidentialite">Politique de confidentialité</a></p>
<button class="btn" type="submit">Envoyer ma demande</button><p class="etat" role="status" aria-live="polite"></p></form>
<div id="merci" class="merci" hidden>✅ <b>Demande envoyée, merci !</b> Nous revenons vers vous sous 2 jours ouvrés avec nos conditions et nos tarifs. Une confirmation part aussi par email.</div>
<p>Une question ? Écrivez-nous à <a href="mailto:contact@mongazon360.fr">contact@mongazon360.fr</a>.</p></article>
${scriptPartenaires()}`;
  return page({ title: "Paysagistes, jardiniers : recevez des demandes de travaux — Mongazon360®", description,
    path: "/partenaires", ogType: "website", jsonLd, body, style: CSS_PARTENAIRES, pro: true });
}
