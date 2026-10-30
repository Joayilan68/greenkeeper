// scripts/conseils-template.mjs — gabarit HTML statique de la rubrique « Conseils gazon »
// (pages complètes sans JavaScript : lisibles par Google et par les aperçus de partage).
import { readFileSync } from "node:fs";
import { ROBOT_UA } from "../src/lib/platform.js";
import { RESEAUX } from "../src/lib/reseaux.js";
const SITE = "https://mongazon360.fr";
const ARGUMENTS = JSON.parse(readFileSync(new URL("../src/lib/argumentsApp.json", import.meta.url), "utf8"));
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
.app{display:flex;gap:14px;margin:28px 0;padding:18px;border-radius:16px;background:#fff;border:1px solid #cfe3d3;border-left:5px solid #43a047}
.app .ico{font-size:28px;line-height:1.2}.app strong{display:block;font-size:18px;line-height:1.35;color:#1a4731}.app p{margin:6px 0 12px;font-size:15px;color:#3b4d41}
.app .btn{display:inline-block}.app small{display:block;margin-top:10px;font-size:12px}.app small a{color:#5b6f61}
.app.fin{background:#1a4731;border:none;color:#e8f5e9}.app.fin strong{font-size:20px;color:#fff}.app.fin p{color:#d7ead9}.app.fin small a{color:#a5d6a7}
.bandeau{margin:0 0 22px;padding:14px 16px;border-radius:14px;background:#e8f5e9;border:1px solid #c5e1c9}.bandeau p{margin:0 0 10px;font-size:15px;line-height:1.5}
.bandeau div{display:flex;flex-wrap:wrap;gap:8px}.bandeau .play{background:#fff;color:#1a4731;border:1px solid #1a4731}
.bandeau.b{display:flex;align-items:center;gap:10px;padding:10px 12px}.bandeau.b p{flex:1;margin:0;font-size:14px}
.grille{margin:36px 0;padding:22px;border-radius:16px;background:#1a4731;color:#e8f5e9}.grille h2{margin:0 0 14px;font-size:21px;color:#fff}
.grille div{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}.grille .item{display:block;padding:12px;border-radius:12px;background:rgba(255,255,255,.08);color:#e8f5e9;text-decoration:none}
.grille .item b{display:block;margin-top:4px;font-size:15px;color:#fff}.grille .item small{display:block;margin-top:2px;font-size:13px;line-height:1.4;color:#cfe3d3}
.grille>.btn{display:inline-block;margin-top:16px;font-size:16px;padding:12px 22px}.fixe{display:none}.cards{display:grid;gap:12px}
.shop{margin:32px 0 0;padding:18px;border:1px solid #dfe8e1;border-radius:16px;background:#fff}.shop h2{margin:0 0 4px;font-size:19px}
.shop a{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid #eef3ef;text-decoration:none;color:#1f2d24;font-size:15px}
.shop a span:last-child{white-space:nowrap;color:#2e7d32;font-weight:700}.shop .kit{margin:10px 0 0;font-size:14px}.shop small{display:block;font-size:12px;color:#5b6f61;margin-top:8px;line-height:1.5}
article img{max-width:100%;height:auto;border-radius:12px;display:block}.hero{margin:0 0 22px}figure{margin:22px 0}
.duo{display:grid;grid-template-columns:1fr 1fr;gap:8px}figcaption{grid-column:1/-1;font-size:13px;color:#5b6f61;margin-top:4px}
.card{display:block;background:#fff;border:1px solid #dfe8e1;border-radius:14px;padding:16px;text-decoration:none;color:#1f2d24}.card b{color:#1a4731;font-size:17px}
.card span{display:block;font-size:14px;color:#5b6f61;margin-top:4px}.season{font-size:12px;font-weight:700;color:#2e7d32;text-transform:uppercase;letter-spacing:.06em;margin:26px 0 8px}
footer{border-top:1px solid #dfe8e1;background:#fff}footer div{max-width:760px;margin:0 auto;padding:18px 20px;font-size:12px;color:#5b6f61}footer a{color:#5b6f61;margin-right:12px}
@media(max-width:520px){h1{font-size:26px}.bar .btn{padding:8px 12px;font-size:13px}.app{flex-direction:column;gap:8px}article table{display:block;overflow-x:auto}
body{padding-bottom:76px}.fixe{display:block;position:fixed;left:12px;right:12px;bottom:12px;z-index:10;padding:14px;border-radius:14px;font-size:16px;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,.25)}}`;

// ── L'app dans les pages Conseils (chantier « l'app sur toutes les pages », décision de Jordan du 28/10/2026) ──
// Arguments du catalogue unique src/lib/argumentsApp.json. Chaque lien vers l'app est balisé : « encart » = thème et
// position (enregistré avec la page_view de l'app, src/lib/mesure.js), et l'inscription est attribuée à la source
// « conseils » et à l'article d'origine dans Pilotage → Activité.
const aujourdhui = new Date().toISOString().slice(0, 10);
export const THEMES = ARGUMENTS.themes.filter(t => !t.fin || t.fin >= aujourdhui);
const THEME = Object.fromEntries(ARGUMENTS.themes.map(t => [t.id, t]));
export const IDS_APP = new Set(Object.keys(THEME));
const lien = (cible, encart, campagne) =>
  `${cible}?encart=${encart}&amp;utm_source=conseils&amp;utm_medium=article&amp;utm_campaign=${campagne}`;
const PLAY = "https://play.google.com/store/apps/details?id=fr.mongazon360.app";

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

// Bouton Google Play montré seulement dans le navigateur d'un téléphone Android (pas dans l'app installée)
const SCRIPT_PLAY = `<script>(function(){var u=navigator.userAgent||"";if(/Android/i.test(u)&&!matchMedia("(display-mode: standalone)").matches&&(document.referrer||"").indexOf("android-app://")!==0)document.querySelectorAll(".play").forEach(function(e){e.hidden=false;});})();</script>`;

function page({ title, description, path, ogType, jsonLd, body, campagne, image = IMAGE_SITE }) {
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
<style>${CSS}</style>
<script defer src="/_vercel/insights/script.js"></script>
</head>
<body>
<header><div class="bar"><a class="logo" href="/"><img src="/icon-192.png" alt="" />Mongazon360<sup>®</sup></a><a class="btn" href="${lien("/essai", "diagnostic-entete", campagne)}">Diagnostic gratuit</a></div></header>
<main>${body}</main>
<a class="btn fixe" href="${lien("/", "app-bouton", campagne)}">📱 Ouvrir l'app gratuite</a>
${body.includes('class="btn play"') ? SCRIPT_PLAY : ""}${suivi(campagne)}
<footer><div><a href="/conseils">Conseils gazon</a><a href="/a-propos">Qui sommes-nous</a><a href="/mentions-legales">Mentions légales</a><a href="/confidentialite">Confidentialité</a><a href="/cookies">Cookies</a><br />Suivez-nous : ${RESEAUX.map(r => `<a href="${esc(r.url)}" rel="me noopener" target="_blank">${r.nom}</a>`).join("")}<br />© ${new Date().getFullYear()} Mongazon360® — marque déposée et enregistrée à l'EUIPO</div></footer>
</body>
</html>
`;
}

const encart = (t, position, campagne, fin = false) => `<aside class="app${fin ? " fin" : ""}"><span class="ico" aria-hidden="true">${t.icone}</span><div>
<strong>${esc(t.titre)}</strong><p>${esc(t.texte)}</p><a class="btn" href="${lien(t.cible, `${t.id}-${position}`, campagne)}">${esc(t.bouton)}</a>${
  t.mention ? `<small><a href="${esc(t.mention.lien)}">${esc(t.mention.texte)}</a></small>` : ""}</div></aside>`;

// Bandeau sous le titre d'un article, sans cacher le texte : 2 versions à départager par Jordan (visuels du 6/11)
const BANDEAU = "a";
const bandeau = (campagne, version = BANDEAU) => version === "b"
  ? `<div class="bandeau b"><span aria-hidden="true">📱</span><p><b>Gratuit :</b> l'app vous dit quoi faire sur votre pelouse cette semaine.</p><a class="btn" href="${lien("/", "app-bandeau", campagne)}">Ouvrir l'app</a></div>`
  : `<div class="bandeau"><p>📱 <b>Dans l'app, ces conseils deviennent votre plan</b> : quoi faire chez vous cette semaine, selon la météo de votre commune.</p><div><a class="btn" href="${lien("/", "app-bandeau", campagne)}">Ouvrir l'app</a><a class="btn play" hidden href="${PLAY}&amp;referrer=utm_source%3Dconseils%26utm_medium%3Dbandeau%26utm_campaign%3D${campagne}">Télécharger sur Google Play</a></div></div>`;

// Grille « Ce que fait l'app » : rubrique Conseils et Qui sommes-nous
const grille = (campagne) => `<section class="grille"><h2>Ce que fait l'app Mongazon360</h2><div>${THEMES.map(t =>
  `<a class="item" href="${lien(t.cible, `${t.id}-grille`, campagne)}"><span aria-hidden="true">${t.icone}</span><b>${esc(t.court)}</b><small>${esc(t.ligne)}</small></a>`).join("")}</div>
<a class="btn" href="${lien("/", "app-grille", campagne)}">Ouvrir l'app gratuite</a></section>`;

// 3 thèmes par article : ceux de l'en-tête « app », puis 2 au plus trouvés par mots-clés (le sujet, adresse et titre,
// compte triple), puis une rotation propre à l'article pour varier les arguments sur l'ensemble du site
const sansAccent = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function themesArticle(a) {
  const choisis = (a.app || "").split(",").map(x => THEMES.find(t => t.id === x.trim())).filter(Boolean);
  const sujet = sansAccent(`${a.slug} ${a.title}`), resume = sansAccent(a.description);
  const score = (t) => t.motsCles.reduce((n, m) => n + (sujet.includes(sansAccent(m)) ? 3 : resume.includes(sansAccent(m)) ? 1 : 0), 0);
  const trouves = THEMES.filter(t => !choisis.includes(t) && score(t) > 0).sort((x, y) => score(y) - score(x));
  choisis.push(...trouves.slice(0, Math.max(0, 2 - choisis.length)));
  const reste = THEMES.filter(t => !choisis.includes(t));
  let h = [...a.slug].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  while (choisis.length < 3 && reste.length) { choisis.push(reste.splice(h % reste.length, 1)[0]); h = Math.floor(h / 7); }
  return choisis.slice(0, 3);
}

// Encarts dans l'article : après le bloc « En bref », avant l'intertitre du milieu ; le 3e suit l'article
function avecEncarts(html, [haut, milieu], campagne) {
  const bref = html.search(/<blockquote>\s*<p><strong>En bref<\/strong>/);
  const apresBref = bref >= 0 ? html.indexOf("</blockquote>", bref) + "</blockquote>".length : html.indexOf("</p>") + 4;
  const h2 = [...html.matchAll(/<h2[ >]/g)].map(m => m.index).filter(i => i > apresBref);
  const centre = h2.length >= 2 ? h2[Math.floor(h2.length / 2)] : -1;
  let out = html.slice(0, apresBref) + encart(haut, "haut", campagne);
  out += centre > 0 ? html.slice(apresBref, centre) + encart(milieu, "milieu", campagne) + html.slice(centre) : html.slice(apresBref);
  return out;
}

// Encadré « Le matériel conseillé » : catégories du catalogue listées dans l'en-tête de l'article
// (produits: engraisAutomne, antiMousse), 3 gammes par catégorie et 4 produits au plus, liens partenaires Amazon,
// et renvoi vers le kit de saison de l'app
function encadreProduits(cles, produits, campagne) {
  const lignes = cles.flatMap(cle => Object.values(produits[cle]?.tiers || {}).slice(0, 3)).slice(0, 4);
  if (!lignes.length) return "";
  const prix = (n) => `${Number(n).toFixed(2).replace(".", ",")} €`;
  return `<div class="shop"><h2>🛒 Le matériel conseillé</h2>${lignes.map(p =>
    `<a href="${esc(p.url)}" target="_blank" rel="sponsored noopener noreferrer"><span>${esc(p.label)} — ${esc(p.marque)}</span><span>~${prix(p.prix)}</span></a>`).join("")}
<p class="kit">📱 Dans l'app Mongazon360 : le <b>kit de saison</b> calculé pour votre surface et votre budget. <a href="${lien(THEME.achats.cible, "achats-produits", campagne)}">Essayer l'app gratuitement</a></p>
<small>Liens partenaires Amazon : en tant que Partenaire Amazon, Mongazon360® perçoit une commission sur les achats éligibles, sans surcoût pour vous. Prix indicatifs.</small></div>`;
}

// Photo d'article (en-tête « image » et « image_alt ») : public/images/conseils, 1200 × 800 px, sans métadonnées
// Option « bandeau » : version du bandeau, pour comparer les 2 versions sur les visuels
export function articlePage(a, autres, produits = {}, { bandeau: version } = {}) {
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
  const themes = themesArticle(a);
  const body = `<div class="crumb"><a href="/">Accueil</a> › <a href="/conseils">Conseils gazon</a></div>
<article><h1>${esc(a.title)}</h1><div class="meta">${SAISONS[a.saison] || ""} · Mis à jour le ${frDate(a.maj || a.date)} · Par <a href="/a-propos">l'équipe Mongazon360</a></div>
${bandeau(a.slug, version)}${a.image ? `<img class="hero" src="${esc(a.image)}" alt="${esc(a.image_alt)}" width="1200" height="800" fetchpriority="high" />` : ""}
${avecEncarts(a.html, themes, a.slug)}</article>${encadreProduits(a.produits ? a.produits.split(",").map(x => x.trim()) : [], produits, a.slug)}${encart(themes[2], "fin", a.slug, true)}${lies}`;
  return page({ title: `${a.title} — Mongazon360®`, description: a.description, path, ogType: "article", jsonLd, body, campagne: a.slug, image });
}

// Page « Qui sommes-nous » (content/a-propos.md) : qui édite Mongazon360 et d'où viennent ses conseils
export function aProposPage(html) {
  const jsonLd = { "@context": "https://schema.org", "@type": "AboutPage", name: "Qui sommes-nous", url: `${SITE}/a-propos`,
    inLanguage: "fr", about: { "@type": "Organization", name: "Mongazon360", url: SITE, email: "contact@mongazon360.fr",
      logo: `${SITE}/icon-512x512.png`, founder: { "@type": "Person", name: "Jordan" }, sameAs: RESEAUX.map(r => r.url) } };
  const body = `<div class="crumb"><a href="/">Accueil</a> › Qui sommes-nous</div><article>${html}</article>${grille("a-propos")}`;
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
  const body = `<h1>Conseils gazon</h1><p>Tonte, arrosage, semis, mousse, engrais : les bons gestes au bon moment, expliqués simplement par l'équipe Mongazon360.</p>${groupes}${grille("rubrique")}`;
  return page({ title: "Conseils gazon : entretien de la pelouse saison par saison — Mongazon360®",
    description: "Guides pratiques pour une belle pelouse toute l'année : regarnissage, scarification, mousse, engrais, tonte et arrosage, saison par saison.",
    path: "/conseils", ogType: "website", jsonLd, body, campagne: "rubrique" });
}
