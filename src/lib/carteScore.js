// Carte du score en image (1080 × 1350, format portrait des réseaux), partagée par le menu de partage du téléphone :
// le score se voit dans la publication, même sur Facebook qui ne reprend pas le texte (décision de Jordan du 31/10/2026)
const LARGEUR = 1080, HAUTEUR = 1350;
const POLICE = "Nunito, 'Segoe UI', sans-serif";

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

// Renvoie l'image JPEG de la carte (Blob)
export async function carteScore({ score, label }) {
  const [pelouse, bob] = await Promise.all([charger("/gazon-apres.jpg"), charger("/mg360-mascot-transparent.png")]);
  try { await document.fonts?.load(`800 100px ${POLICE}`); } catch { /* police du système */ }
  const toile = document.createElement("canvas");
  toile.width = LARGEUR;
  toile.height = HAUTEUR;
  const ctx = toile.getContext("2d");
  const valeur = Math.max(0, Math.min(100, Math.round(score)));
  const couleur = couleurScore(valeur);

  // Fond vert foncé, notre pelouse en bas
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

  // Marque et titre
  ctx.textAlign = "left";
  ecrire(ctx, "Mongazon360®", 72, 112, { taille: 46, couleur: "#a5d6a7" });
  ecrire(ctx, "Le score santé", 72, 212, { taille: 70, couleur: "#ffffff" });
  ecrire(ctx, "de ma pelouse", 72, 292, { taille: 70, couleur: "#ffffff" });

  // Jauge, score et libellé
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
  ecrire(ctx, String(valeur), cx, cy + 62, { taille: 190, couleur: "#ffffff" });
  ecrire(ctx, "/100", cx, cy + 128, { taille: 48, poids: 700, couleur: "#a5d6a7" });
  ecrire(ctx, label, cx, cy + 250, { taille: 72, couleur, largeurMax: 560 });

  // Bob debout sur la pelouse, à droite
  const hauteurBob = 470, largeurBob = hauteurBob * bob.width / bob.height;
  ctx.drawImage(bob, LARGEUR - largeurBob - 40, HAUTEUR - hauteurBob - 18, largeurBob, hauteurBob);

  // Invitation, à gauche sur la pelouse
  ctx.fillStyle = "rgba(13,43,26,0.88)";
  rectangleArrondi(ctx, 56, 1098, 640, 196, 30);
  ctx.fill();
  ctx.textAlign = "left";
  ecrire(ctx, "Et la vôtre ?", 92, 1162, { taille: 50, couleur: "#ffffff", largeurMax: 570 });
  ecrire(ctx, "Diagnostic photo gratuit sur", 92, 1214, { taille: 34, poids: 700, couleur: "#a5d6a7", largeurMax: 570 });
  ecrire(ctx, "mongazon360.fr", 92, 1268, { taille: 46, couleur: "#ffffff", largeurMax: 570 });

  return new Promise((ok, ko) => toile.toBlob(b => (b ? ok(b) : ko(new Error("carte du score vide"))), "image/jpeg", 0.9));
}
