// scripts/indexnow.mjs
// Signale à Bing et aux autres moteurs IndexNow (Yandex, Seznam, Naver…) les pages modifiées de mongazon360.fr.
// Lancé par .github/workflows/indexnow.yml après chaque mise en prod qui touche content/conseils ; à la main :
//   node scripts/indexnow.mjs content/conseils/mousse-pelouse.md https://mongazon360.fr/conseils/gel-pelouse
// La clé, publique par principe, est le fichier public/<clé>.txt servi à la racine du site.
// Google n'utilise pas IndexNow : pour lui, plan du site (date « maj ») et demande d'indexation dans la Search Console.
import { readdirSync } from "node:fs";

const SITE = "https://mongazon360.fr";
const fichierCle = readdirSync("public").find(f => /^[0-9a-f]{32}\.txt$/.test(f));
if (!fichierCle) throw new Error("[indexnow] fichier de clé introuvable dans public/");
const key = fichierCle.slice(0, -4);

// Arguments : adresses complètes ou fichiers content/conseils/<slug>.md (sortie de git diff) ; la liste des articles suit
const pages = process.argv.slice(2).map(a => {
  const article = a.match(/^content\/conseils\/([a-z0-9-]+)\.md$/);
  return article ? `${SITE}/conseils/${article[1]}` : a;
}).filter(u => u.startsWith(`${SITE}/`));
if (!pages.length) { console.log("[indexnow] aucune page à signaler"); process.exit(0); }
const urlList = [...new Set([...pages, `${SITE}/conseils`])];

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: "mongazon360.fr", key, keyLocation: `${SITE}/${fichierCle}`, urlList }),
});
console.log(`[indexnow] ${res.status} ${res.statusText} · ${urlList.length} page(s)\n  ${urlList.join("\n  ")}`);
if (res.status >= 400) process.exit(1);
