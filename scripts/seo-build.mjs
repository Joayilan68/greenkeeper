// scripts/seo-build.mjs — exécuté après « vite build »
// 1. Pages publiques de l'app (src/lib/seoPages.json) : dist/<page>/index.html avec leur titre,
//    description, adresse canonique et balises de partage (lues sans JavaScript).
// 2. Rubrique « Conseils gazon » : articles Markdown de content/conseils → pages HTML statiques.
// 3. dist/sitemap.xml.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { marked } from "marked";
import { articlePage, indexPage } from "./conseils-template.mjs";

const SITE  = "https://mongazon360.fr";
const pages = JSON.parse(readFileSync("src/lib/seoPages.json", "utf8"));
const base  = readFileSync("dist/index.html", "utf8");
const esc   = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function render(page) {
  const url = SITE + (page.path === "/" ? "" : page.path);
  const t = esc(page.title), d = esc(page.description);
  const set = (html, re, value) => {
    if (!re.test(html)) throw new Error(`Balise introuvable dans index.html : ${re}`);
    return html.replace(re, value);
  };
  let html = base;
  html = set(html, /<title>[^<]*<\/title>/, `<title>${t}</title>`);
  html = set(html, /(<meta name="description" content=")[^"]*(")/, `$1${d}$2`);
  html = set(html, /(<meta name="robots" content=")[^"]*(")/, `$1${page.noindex ? "noindex, follow" : "index, follow"}$2`);
  html = set(html, /(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
  html = set(html, /(<meta property="og:url"\s+content=")[^"]*(")/, `$1${url}$2`);
  html = set(html, /(<meta property="og:title"\s+content=")[^"]*(")/, `$1${t}$2`);
  html = set(html, /(<meta property="og:description"\s+content=")[^"]*(")/, `$1${d}$2`);
  html = set(html, /(<meta name="twitter:url"\s+content=")[^"]*(")/, `$1${url}$2`);
  html = set(html, /(<meta name="twitter:title"\s+content=")[^"]*(")/, `$1${t}$2`);
  html = set(html, /(<meta name="twitter:description"\s+content=")[^"]*(")/, `$1${d}$2`);
  return html;
}

// Chaque page pré-générée doit être servie par la règle dédiée de vercel.json (sinon Vercel
// renverrait l'index de l'app avec les balises de l'accueil)
const vercel = readFileSync("vercel.json", "utf8");
for (const page of pages) {
  if (page.path !== "/" && !vercel.includes(page.path.slice(1))) {
    throw new Error(`[seo] ${page.path} absent de la règle de vercel.json (rewrites)`);
  }
}

for (const page of pages) {
  if (page.path === "/") { writeFileSync("dist/index.html", render(page)); continue; }
  mkdirSync(`dist${page.path}`, { recursive: true });
  writeFileSync(`dist${page.path}/index.html`, render(page));
}

// ── Conseils gazon ──────────────────────────────────────────────────────────
// Chaque fichier : en-tête « clé: valeur » entre deux lignes « --- » (title, description,
// saison = automne|hiver|printemps|ete, date AAAA-MM-JJ, maj facultative, brouillon: oui pour masquer).
const articles = readdirSync("content/conseils").filter(f => f.endsWith(".md")).map(f => {
  const [, head, md] = readFileSync(`content/conseils/${f}`, "utf8").match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    || (() => { throw new Error(`[seo] en-tête manquant : ${f}`); })();
  const meta = Object.fromEntries(head.split("\n").map(l => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]));
  for (const k of ["title", "description", "saison", "date"]) if (!meta[k]) throw new Error(`[seo] ${f} : « ${k} » manquant`);
  return { ...meta, slug: f.replace(/\.md$/, ""), html: marked.parse(md) };
}).filter(a => a.brouillon !== "oui").sort((a, b) => a.date.localeCompare(b.date));

mkdirSync("dist/conseils", { recursive: true });
writeFileSync("dist/conseils/index.html", indexPage(articles));
for (const a of articles) {
  const autres = articles.filter(o => o.slug !== a.slug && o.saison === a.saison).slice(0, 3);
  mkdirSync(`dist/conseils/${a.slug}`, { recursive: true });
  writeFileSync(`dist/conseils/${a.slug}/index.html`, articlePage(a, autres));
}

const today = new Date().toISOString().slice(0, 10);
const urls  = [
  ...pages.filter(p => !p.noindex).map(p =>
    `  <url><loc>${SITE}${p.path === "/" ? "/" : p.path}</loc><lastmod>${today}</lastmod><priority>${p.priority}</priority></url>`),
  `  <url><loc>${SITE}/conseils</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>`,
  ...articles.map(a => `  <url><loc>${SITE}/conseils/${a.slug}</loc><lastmod>${a.maj || a.date}</lastmod><priority>0.7</priority></url>`),
];
writeFileSync("dist/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);
console.log(`[seo] ${pages.length} pages, ${articles.length} articles, sitemap : ${urls.length} adresses`);
