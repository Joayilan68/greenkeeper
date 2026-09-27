// src/lib/bilanSaison.js
// Bilan de saison (page /bilan) : ce que l'utilisateur a fait pour son gazon pendant l'année, à partir de
// ses actions notées (table histories, toute l'année), de ses diagnostics photo, badges et dépenses,
// et image à partager.
import { BADGES } from "./useBadges";
import { totalAnnee } from "./depenses";

// Saison affichée : l'année en cours, sauf en janvier-février (bilan de l'année écoulée)
export const anneeDuBilan = (now = new Date()) => now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear();

// Période où le tableau de bord propose le bilan : du 15 novembre au 28 février
export function bilanDisponible(now = new Date()) {
  const m = now.getMonth() + 1, j = now.getDate();
  return (m === 11 && j >= 15) || m === 12 || m <= 2;
}

const TYPES = [
  { cle: "tontes",      label: "tontes",      icone: "✂️", motif: /tonte/ },
  { cle: "arrosages",   label: "arrosages",   icone: "💧", motif: /arros/ },
  { cle: "engrais",     label: "engrais",     icone: "🌱", motif: /engrais/ },
  { cle: "desherbages", label: "désherbages", icone: "🪴", motif: /d[ée]sherb/ },
  { cle: "soinsSol",    label: "aérations et scarifications", icone: "🌀", motif: /a[ée]ration|scarif|verticut/ },
  { cle: "semis",       label: "semis et regarnissages", icone: "🌾", motif: /semis|semence|regarn/ },
];

export function calculerBilan({ annee, actions = [], diagnostics = [], profile = {}, greenPoints = 0, streakRecord = 0 }) {
  const compte = Object.fromEntries(TYPES.map(t => [t.cle, 0]));
  for (const a of actions) {
    const texte = String(a.action || "").toLowerCase();
    const type = TYPES.find(t => t.motif.test(texte));
    if (type) compte[type.cle]++;
  }
  const diagsAnnee = diagnostics
    .filter(d => String(d.date || "").startsWith(String(annee)) && typeof d.analysis?.score_visuel === "number")
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const badges = Object.entries(profile?.badges || {})
    .filter(([, v]) => String(v?.at || "").startsWith(String(annee)))
    .map(([id]) => BADGES.find(b => b.id === id)).filter(Boolean);

  return {
    annee,
    actions: actions.length,
    lignes: TYPES.map(t => ({ ...t, n: compte[t.cle] })).filter(t => t.n > 0),
    diagnostics: diagsAnnee.length,
    scorePhoto: diagsAnnee.length >= 2
      ? { debut: diagsAnnee[0].analysis.score_visuel, fin: diagsAnnee[diagsAnnee.length - 1].analysis.score_visuel } : null,
    badges,
    depenses: annee === new Date().getFullYear() ? totalAnnee(profile) : null, // dépenses gardées pour l'année en cours seulement
    greenPoints,
    streakRecord,
  };
}

// Image du bilan à partager (1080 × 1350, format des réseaux sociaux)
export async function imageBilan(b, prenom) {
  const c = document.createElement("canvas");
  c.width = 1080; c.height = 1350;
  const x = c.getContext("2d");
  const fond = x.createLinearGradient(0, 0, 0, 1350);
  fond.addColorStop(0, "#0d2b1a"); fond.addColorStop(1, "#1b5e20");
  x.fillStyle = fond; x.fillRect(0, 0, 1080, 1350);
  x.textAlign = "center";
  x.fillStyle = "#a5d6a7"; x.font = "bold 40px Arial";
  x.fillText("MA SAISON GAZON", 540, 120);
  x.fillStyle = "#ffffff"; x.font = "bold 120px Arial";
  x.fillText(String(b.annee), 540, 250);
  if (prenom) { x.fillStyle = "#c8e6c9"; x.font = "36px Arial"; x.fillText(`le bilan de ${prenom}`, 540, 310); }

  const tuiles = [
    ...b.lignes.slice(0, 4).map(l => [l.icone, l.n, l.label]),
    ...(b.scorePhoto ? [["📸", `${b.scorePhoto.debut} → ${b.scorePhoto.fin}`, "score photo"]] : []),
    ...(b.badges.length ? [["🏅", b.badges.length, b.badges.length > 1 ? "badges gagnés" : "badge gagné"]] : []),
    ["⭐", b.greenPoints, "GreenPoints"],
  ].slice(0, 6);
  tuiles.forEach(([icone, n, label], i) => {
    const cx = i % 2 === 0 ? 290 : 790, cy = 420 + Math.floor(i / 2) * 250;
    x.fillStyle = "rgba(255,255,255,0.08)";
    x.beginPath(); x.roundRect(cx - 230, cy - 20, 460, 210, 28); x.fill();
    x.fillStyle = "#ffffff"; x.font = "64px Arial"; x.fillText(icone, cx, cy + 60);
    x.fillStyle = "#ffffff"; x.font = "bold 64px Arial"; x.fillText(String(n), cx, cy + 135);
    x.fillStyle = "#a5d6a7"; x.font = "30px Arial"; x.fillText(label, cx, cy + 175);
  });

  x.fillStyle = "#ffffff"; x.font = "bold 44px Arial";
  x.fillText("Mongazon360", 540, 1235);
  x.fillStyle = "#a5d6a7"; x.font = "32px Arial";
  x.fillText("Ton gazon, suivi toute l'année · mongazon360.fr", 540, 1285);
  return new Promise(res => c.toBlob(res, "image/png"));
}
