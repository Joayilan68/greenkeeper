// scripts/conseils-template.mjs — gabarit HTML statique de la rubrique « Conseils gazon »
// (pages complètes sans JavaScript : lisibles par Google et par les aperçus de partage).
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
.card{display:block;background:#fff;border:1px solid #dfe8e1;border-radius:14px;padding:16px;text-decoration:none;color:#1f2d24}.card b{color:#1a4731;font-size:17px}
.card span{display:block;font-size:14px;color:#5b6f61;margin-top:4px}.season{font-size:12px;font-weight:700;color:#2e7d32;text-transform:uppercase;letter-spacing:.06em;margin:26px 0 8px}
footer{border-top:1px solid #dfe8e1;background:#fff}footer div{max-width:760px;margin:0 auto;padding:18px 20px;font-size:12px;color:#5b6f61}footer a{color:#5b6f61;margin-right:12px}
@media(max-width:520px){h1{font-size:26px}.bar .btn{padding:8px 12px;font-size:13px}}`;

// Liens vers l'essai gratuit balisés : l'inscription est attribuée à la source « conseils »
// (et à l'article d'origine) dans Pilotage → Activité, au lieu de « autre ».
const essai = (campagne) => `/essai?utm_source=conseils&amp;utm_medium=article&amp;utm_campaign=${campagne}`;

const SAISONS = { automne: "🍂 Automne", hiver: "❄️ Hiver", printemps: "🌱 Printemps", ete: "☀️ Été" };
const frDate = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

function page({ title, description, path, ogType, jsonLd, body, campagne }) {
  const url = SITE + path;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="${url}" />
<link rel="icon" href="/favicon.ico" />
<meta property="og:type" content="${ogType}" />
<meta property="og:url" content="${url}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${SITE}/og-image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content="fr_FR" />
<meta property="og:site_name" content="Mongazon360®" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${SITE}/og-image.jpg" />
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>${CSS}</style>
<script defer src="/_vercel/insights/script.js"></script>
</head>
<body>
<header><div class="bar"><a class="logo" href="/"><img src="/icon-192.png" alt="" />Mongazon360<sup>®</sup></a><a class="btn" href="${essai(campagne)}">Diagnostic gratuit</a></div></header>
<main>${body}</main>
<footer><div><a href="/conseils">Conseils gazon</a><a href="/mentions-legales">Mentions légales</a><a href="/confidentialite">Confidentialité</a><a href="/cookies">Cookies</a><br />© ${new Date().getFullYear()} Mongazon360® — marque déposée et enregistrée à l'EUIPO</div></footer>
</body>
</html>
`;
}

const cta = (campagne) => `<div class="cta"><strong>Votre gazon mérite un vrai diagnostic</strong>Prenez votre pelouse en photo : Bob repère mousse, carences et maladies, et vous dit quoi faire selon votre météo.<br /><a class="btn" href="${essai(campagne)}">Essayer gratuitement</a></div>`;

export function articlePage(a, autres) {
  const path = `/conseils/${a.slug}`;
  const jsonLd = { "@context": "https://schema.org", "@graph": [
    { "@type": "Article", headline: a.title, description: a.description, image: `${SITE}/og-image.jpg`,
      datePublished: a.date, dateModified: a.maj || a.date, inLanguage: "fr",
      author: { "@type": "Organization", name: "Mongazon360", url: SITE },
      publisher: { "@type": "Organization", name: "Mongazon360", logo: { "@type": "ImageObject", url: `${SITE}/icon-512x512.png` } },
      mainEntityOfPage: `${SITE}${path}` },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Conseils gazon", item: `${SITE}/conseils` },
      { "@type": "ListItem", position: 3, name: a.title, item: `${SITE}${path}` } ] } ] };
  const lies = autres.length ? `<h2>À lire aussi</h2><div class="cards">${autres.map(o =>
    `<a class="card" href="/conseils/${o.slug}"><b>${esc(o.title)}</b><span>${esc(o.description)}</span></a>`).join("")}</div>` : "";
  const body = `<div class="crumb"><a href="/">Accueil</a> › <a href="/conseils">Conseils gazon</a></div>
<article><h1>${esc(a.title)}</h1><div class="meta">${SAISONS[a.saison] || ""} · Mis à jour le ${frDate(a.maj || a.date)} · Par l'équipe Mongazon360</div>
${a.html}</article>${cta(a.slug)}${lies}`;
  return page({ title: `${a.title} — Mongazon360®`, description: a.description, path, ogType: "article", jsonLd, body, campagne: a.slug });
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
