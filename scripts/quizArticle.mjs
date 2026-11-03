// scripts/quizArticle.mjs — « La question de la semaine » du quiz d'hiver dans les articles Conseils (décision de Jordan du
// 3/11/2026 : faire jouer les visiteurs, qui arrivent 9 fois sur 10 sur un article). La question 1 du quiz de la semaine
// (déjà publiée chaque dimanche sur Facebook) et ses 3 choix, jamais la réponse : le visiteur choisit, puis il est invité à
// créer son compte pour jouer le quiz complet (règlement : CGU, article 6 g). Semaine calculée dans la page, heure de Paris,
// avec la règle de src/lib/ligueHiver.js (debutTest hors de mongazon360.fr) ; bloc caché en dehors de la ligue. Réponse
// comptée dans funnel_events (« quiz_question », avec la semaine et l'article), lien balisé encart=quiz-question.
import { readFileSync } from "node:fs";
import { ROBOT_UA } from "../src/lib/platform.js";

const LIGUE = JSON.parse(readFileSync(new URL("../src/lib/ligueHiver.json", import.meta.url), "utf8"));
// Seulement le thème, la question 1 et ses choix : ni la bonne réponse ni l'explication dans la page
const SEMAINES = LIGUE.programme.map(s => ({ t: s.theme, q: s.quiz[0].q, c: s.quiz[0].choix }));
const DATES = { debut: LIGUE.debut, debutTest: LIGUE.debutTest, semaines: LIGUE.semaines };

export const CSS_QUIZ = `
.quiz[hidden],.quiz [hidden],[data-avant-quiz][hidden]{display:none!important}
.quiz{margin:22px 0;padding:18px 18px 16px;border-radius:16px;background:#fff7e0;border:1px solid #f0d58a}
.quiz .tete{font-size:13px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#8a5a00;margin:0 0 6px}
.quiz .q{font-size:18px;font-weight:800;line-height:1.35;color:#1f2d24;margin:0 0 12px}
.quiz .choix{display:grid;gap:8px}
.quiz .choix button{font:inherit;font-size:16px;text-align:left;padding:11px 14px;border-radius:12px;border:1px solid #e3c779;background:#fff;color:#1f2d24;cursor:pointer}
.quiz .choix button:disabled{cursor:default;opacity:.65}
.quiz .choix button.choisi{opacity:1;border-color:#2e7d32;background:#e8f5e9;font-weight:700}
.quiz .suite{margin-top:14px}.quiz .suite p{margin:0 0 12px;font-size:16px}
.quiz small{display:block;margin-top:10px;font-size:13px}.quiz small a{color:#5b6f61}`;

// lienJouer : création de compte balisée (encart=quiz-question) ; url, anon : Supabase public (mesure) ; page : article
export function blocQuiz({ lienJouer, url, anon, page }) {
  return `<section class="quiz" id="quiz-semaine" hidden aria-label="La question de la semaine du quiz d'hiver">
<p class="tete">🧠 Quiz d'hiver · semaine <span data-n></span> · <span data-theme></span></p>
<p class="q"></p><div class="choix"></div>
<div class="suite" hidden><p><b>Réponse notée !</b> Bonne ou pas ? Vous le saurez en jouant le quiz complet dans l'app : 3 questions en 1 minute, et le défi de la semaine. C'est gratuit, et le plus assidu de l'hiver gagne 1 an de Premium.</p>
<a class="btn" href="${lienJouer}">Créer mon compte et jouer</a><small>Le quiz est dans l'onglet « Quiz » de l'app. <a href="/cgu">Règlement : CGU, article 6 g</a></small></div>
</section>
<script>(function(){try{
var S=${JSON.stringify(SEMAINES)},D=${JSON.stringify(DATES)};
var deb=/^(www\\.)?mongazon360\\.fr$/.test(location.hostname)?D.debut:D.debutTest;
var num=function(j){return Date.parse(j+"T00:00:00Z")/864e5;},j=new Date().toLocaleDateString("fr-CA",{timeZone:"Europe/Paris"});
var n=Math.floor((num(j)-num(deb))/7)+1,s=S[n-1],b=document.getElementById("quiz-semaine");
if(num(j)<num(deb)||n>D.semaines||!s||!b)return;
b.querySelector("[data-n]").textContent=n;b.querySelector("[data-theme]").textContent=s.t;b.querySelector(".q").textContent=s.q;
var choix=b.querySelector(".choix");
s.c.forEach(function(c,i){var x=document.createElement("button");x.type="button";x.textContent=String.fromCharCode(65+i)+". "+c;
x.onclick=function(){if(b.getAttribute("data-fait"))return;b.setAttribute("data-fait","1");
[].forEach.call(choix.children,function(e){e.disabled=true;});x.className="choisi";b.querySelector(".suite").hidden=false;
var U="${url}",A="${anon}";
if(U&&A&&!navigator.webdriver&&!${ROBOT_UA}.test(navigator.userAgent))fetch(U+"/rest/v1/funnel_events",{method:"POST",
headers:{apikey:A,Authorization:"Bearer "+A,"Content-Type":"application/json",Prefer:"return=minimal"},
body:JSON.stringify({step:"quiz_question",meta:{semaine:n,page:"${page}"},path:location.pathname,visite:sessionStorage.getItem("mg360_visite")})}).catch(function(){});};
choix.appendChild(x);});
b.hidden=false;var h=document.querySelector("[data-avant-quiz]");if(h)h.hidden=true;
}catch(e){}})();</script>`;
}
