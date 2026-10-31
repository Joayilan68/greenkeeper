// Images partagées par le menu de partage du téléphone (1080 × 1350, format portrait des réseaux) : le résultat se voit
// dans la publication, même sur Facebook qui ne reprend pas le texte (décisions de Jordan du 31/10/2026). Carte du score
// (Mon gazon → Partager) et carte du résultat du quiz de la ligue d'hiver ; fond commun : notre pelouse et Bob.
const LARGEUR = 1080, HAUTEUR = 1350;
const POLICE = "Nunito, 'Segoe UI', sans-serif";
const BLANC = "#ffffff", VERT_CLAIR = "#a5d6a7", GIVRE = "#90caf9";

// Mêmes seuils que le libellé du score (lawnScore.js), en teintes lisibles sur fond vert foncé
const couleurScore = (s) => s >= 85 ? "#66bb6a" : s >= 70 ? "#9ccc65" : s >= 55 ? "#fdd835" : s >= 40 ? "#ffa726" : "#ef5350";

const charger = (src) => new Promise((ok, ko) => {
  const image = new Image();
  image.onload = () => ok(image);
  image.onerror = ko;
  image.src = src;
});

// Image qui remplit un rectangle sans être déformée (comme object-fit: cover)
function couvrir(ctx, image, x, y, l, h) {
  const r = Math.max(l / image.width, h / image.height);
  const sl = l / r, sh = h / r;
  ctx.drawImage(image, (image.width - sl) / 2, (image.height - sh) / 2, sl, sh, x, y, l, h);
}

// Texte réduit jusqu'à tenir dans la largeur donnée
function ecrire(ctx, texte, x, y, { taille, poids = 800, couleur, largeurMax }) {
  let t = taille;
  ctx.font = `${poids} ${t}px ${POLICE}`;
  while (largeurMax && ctx.measureText(texte).width > largeurMax && t > 20) ctx.font = `${poids} ${--t}px ${POLICE}`;
  ctx.fillStyle = couleur;
  ctx.fillText(texte, x, y);
}

function rectangleArrondi(ctx, x, y, l, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + l, y, x + l, y + h, r);
  ctx.arcTo(x + l, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + l, y, r);
  ctx.closePath();
}

// Dessine une carte : fond, contenu propre à la carte, Bob sur la pelouse, invitation (3 lignes) ; renvoie le JPEG
async function carte(dessinerContenu, invitation) {
  const [pelouse, bob] = await Promise.all([charger("/gazon-apres.jpg"), charger("/mg360-mascot-transparent.png")]);
  try { await document.fonts?.load(`800 100px ${POLICE}`); } catch { /* police du système */ }
  const toile = document.createElement("canvas");
  toile.width = LARGEUR;
  toile.height = HAUTEUR;
  const ctx = toile.getContext("2d");

  const fond = ctx.createLinearGradient(0, 0, 0, HAUTEUR);
  fond.addColorStop(0, "#0d2b1a");
  fond.addColorStop(1, "#1a4731");
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  couvrir(ctx, pelouse, 0, 930, LARGEUR, 420);
  const fondu = ctx.createLinearGradient(0, 930, 0, 1080);
  fondu.addColorStop(0, "#173f2b");
  fondu.addColorStop(1, "rgba(23,63,43,0)");
  ctx.fillStyle = fondu;
  ctx.fillRect(0, 930, LARGEUR, 150);

  ctx.textAlign = "left";
  ecrire(ctx, "Mongazon360®", 72, 112, { taille: 46, couleur: VERT_CLAIR });
  dessinerContenu(ctx);

  const hauteurBob = 470, largeurBob = hauteurBob * bob.width / bob.height;
  ctx.drawImage(bob, LARGEUR - largeurBob - 40, HAUTEUR - hauteurBob - 18, largeurBob, hauteurBob);

  ctx.fillStyle = "rgba(13,43,26,0.88)";
  rectangleArrondi(ctx, 56, 1098, 640, 196, 30);
  ctx.fill();
  ctx.textAlign = "left";
  const [haut, milieu, bas] = invitation;
  ecrire(ctx, haut, 92, 1162, { taille: 50, couleur: BLANC, largeurMax: 570 });
  ecrire(ctx, milieu, 92, 1214, { taille: 34, poids: 700, couleur: VERT_CLAIR, largeurMax: 570 });
  ecrire(ctx, bas, 92, 1268, { taille: 46, couleur: BLANC, largeurMax: 570 });

  return new Promise((ok, ko) => toile.toBlob(b => (b ? ok(b) : ko(new Error("carte vide"))), "image/jpeg", 0.9));
}

// Invitation du bas de la carte : avec le code de parrainage, l'offre de bienvenue (1 mois de Premium offert)
const offre = (code, sinon) => (code ? `Code ${code} : 1 mois de Premium offert sur` : sinon);

// Score santé de la pelouse : jauge, score sur 100 et libellé
export function carteScore({ score, label, code }) {
  const valeur = Math.max(0, Math.min(100, Math.round(score)));
  const couleur = couleurScore(valeur);
  return carte((ctx) => {
    ecrire(ctx, "Le score santé", 72, 212, { taille: 70, couleur: BLANC });
    ecrire(ctx, "de ma pelouse", 72, 292, { taille: 70, couleur: BLANC });
    const cx = 540, cy = 640, rayon = 230, debut = Math.PI * 0.8, fin = Math.PI * 2.2;
    ctx.lineCap = "round";
    ctx.lineWidth = 46;
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath();
    ctx.arc(cx, cy, rayon, debut, fin);
    ctx.stroke();
    if (valeur > 0) {
      ctx.strokeStyle = couleur;
      ctx.beginPath();
      ctx.arc(cx, cy, rayon, debut, debut + (fin - debut) * valeur / 100);
      ctx.stroke();
    }
    ctx.textAlign = "center";
    ecrire(ctx, String(valeur), cx, cy + 62, { taille: 190, couleur: BLANC });
    ecrire(ctx, "/100", cx, cy + 128, { taille: 48, poids: 700, couleur: VERT_CLAIR });
    ecrire(ctx, label, cx, cy + 250, { taille: 72, couleur, largeurMax: 560 });
  }, ["Et la vôtre ?", offre(code, "Diagnostic photo gratuit sur"), "mongazon360.fr"]);
}

// Résultat du quiz de la semaine (ligue d'hiver) : bonnes réponses, une pastille par question ; jamais les réponses
export function carteQuiz({ bonnes, total, semaine, theme, duree, code }) {
  const message = bonnes === total ? "Sans faute !" : bonnes === total - 1 ? "Presque parfait !" : "Défi relevé !";
  return carte((ctx) => {
    ecrire(ctx, `LIGUE D'HIVER · SEMAINE ${semaine}`, 72, 190, { taille: 40, couleur: GIVRE, largeurMax: 936 });
    ecrire(ctx, "Le quiz gazon", 72, 268, { taille: 70, couleur: BLANC });
    ecrire(ctx, "de la semaine", 72, 348, { taille: 70, couleur: BLANC });
    ecrire(ctx, `Thème : ${theme.toLowerCase()}`, 72, 410, { taille: 40, poids: 700, couleur: VERT_CLAIR, largeurMax: 936 });
    ctx.textAlign = "center";
    ecrire(ctx, `${bonnes}/${total}`, 540, 650, { taille: 200, couleur: BLANC });
    const pas = 110, x0 = 540 - (pas * (total - 1)) / 2;
    for (let i = 0; i < total; i++) {
      const x = x0 + i * pas, y = 740, juste = i < bonnes;
      ctx.beginPath();
      ctx.arc(x, y, 36, 0, Math.PI * 2);
      ctx.fillStyle = juste ? "#43a047" : "rgba(255,255,255,0.10)";
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = juste ? "#66bb6a" : "rgba(255,255,255,0.35)";
      ctx.stroke();
      if (juste) {
        ctx.lineWidth = 8;
        ctx.lineCap = "round";
        ctx.strokeStyle = BLANC;
        ctx.beginPath();
        ctx.moveTo(x - 15, y + 1);
        ctx.lineTo(x - 4, y + 13);
        ctx.lineTo(x + 17, y - 12);
        ctx.stroke();
      }
    }
    ecrire(ctx, message, 540, 868, { taille: 66, couleur: bonnes === total ? "#66bb6a" : "#fdd835" });
  }, ["Et toi ?", offre(code, `Quiz gratuit : ${total} questions en ${duree} sur`), "mongazon360.fr"]);
}
