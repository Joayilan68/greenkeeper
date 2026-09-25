// scripts/seo-build.mjs — exécuté après « vite build »
// Pour chaque page publique (src/lib/seoPages.json) : dist/<page>/index.html avec son titre,
// sa description, son adresse canonique et ses balises de partage (lues par Google, Facebook,
// WhatsApp, LinkedIn sans JavaScript). Génère aussi dist/sitemap.xml.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

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

const today = new Date().toISOString().slice(0, 10);
const urls  = pages.filter(p => !p.noindex).map(p =>
  `  <url><loc>${SITE}${p.path === "/" ? "/" : p.path}</loc><lastmod>${today}</lastmod><priority>${p.priority}</priority></url>`);
writeFileSync("dist/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);
console.log(`[seo] ${pages.length} pages, sitemap : ${urls.length} adresses`);
