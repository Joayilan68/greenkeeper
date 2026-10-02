// src/lib/planAnnuel.js
// Plan annuel personnalisé (page /plan-annuel, achat unique) : les 12 mois d'entretien du gazon de l'utilisateur,
// construits uniquement à partir des règles partagées de l'app : calendrier des actions (calendrierActions.json),
// dates de la zone (zonesGazon.json), hauteurs de tonte (tonteGazon.json), arrosage selon le sol (arrosageSol.json),
// doses d'engrais du plan mensuel, et travaux d'hiver des notifications. Aucune règle propre à ce fichier.
import ZONES from "./zonesGazon.json";
import TONTE from "./tonteGazon.json";
import ARROSAGE from "./arrosageSol.json";
import { MONTHLY_PLAN } from "./lawn";
import { moisCalendrier, zoneClimatique, hasRobotTondeuse, hasArrosageAuto } from "./planEntretien";

export const PRIX_PLAN_ANNUEL = "0,99 €";
export const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

// Plan vendu : celui de l'année suivante à partir d'octobre (même règle que api/create-checkout.js)
export const anneePlan = (now = new Date()) => now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();

const jourMois = ([m, j]) => `${j === 1 ? "1er" : j} ${MOIS[m - 1]}`;
const dansFenetre = (m, f) => m >= f.debutPossible[0] && m <= f.finOptimal[0];

export function planAnnuel(profile, annee) {
  const cle = ZONES[zoneClimatique(profile)] ? zoneClimatique(profile) : "centre";
  const z = ZONES[cle];
  const mois = (id) => moisCalendrier(id, cle, profile);
  const naturel = profile?.objectif === "naturel";
  const robot = hasRobotTondeuse(profile);
  const t = TONTE.types[TONTE.alias[profile?.pelouse] || "universel"];
  const hauteur = (m) => (m >= 6 && m <= 8 ? t.ete : m >= 9 ? t.automne : t.printemps) + (naturel ? " cm (+1 cm en objectif naturel)" : " cm");
  const arrosageSol = ARROSAGE[profile?.sol];
  const revision = new Date(annee, z.premiereTonte[0] - 1, z.premiereTonte[1] - 21);
  const scarif = mois("scarification"), aeration = mois("aeration");

  const items = (m) => {
    const l = [];
    const ajoute = (icone, titre, detail) => l.push({ icone, titre, detail });
    if (revision.getMonth() + 1 === m) ajoute(robot ? "🤖" : "🔧", robot ? "Remise en route du robot" : "Révision de la tondeuse",
      `Vers le ${revision.getDate() === 1 ? "1er" : revision.getDate()} ${MOIS[m - 1]} : ${robot ? "nettoyage, lames neuves, hauteur de coupe haute" : "lame affûtée, tondeuse révisée"}.`);
    if (mois("tonte").includes(m) && m >= z.premiereTonte[0]) { // jamais avant le mois de la 1re tonte de la zone
      if (m === z.premiereTonte[0]) ajoute("✂️", "1re tonte de l'année", `Vers le ${jourMois(z.premiereTonte)} selon la reprise de la pousse, en haut de la fourchette (${hauteur(m)}), jamais plus d'un tiers.`);
      else if (m === 11) ajoute("✂️", "Dernière tonte de l'année", `Par temps sec et doux, à ${hauteur(m)}.`);
      else ajoute("✂️", robot ? "Tonte par le robot" : "Tonte", `Hauteur ${hauteur(m)}, jamais plus d'un tiers de la hauteur.${robot ? " Vérifie que le robot tond bien (lame, hauteur)." : ""}`);
    }
    if (mois("arrosage").includes(m)) ajoute("💧", hasArrosageAuto(profile) ? "Arrosage (programmateur)" : "Arrosage selon la météo",
      `${arrosageSol ? `Pour ton sol : ${arrosageSol}.` : "Le matin, en profondeur plutôt que souvent."} « Aujourd'hui » calcule les besoins chaque jour, pluie déduite.`);
    if (mois("engrais_starter").includes(m)) ajoute("🌱", naturel ? "Engrais organique de printemps" : "Engrais de démarrage",
      `${naturel ? "Farine de corne ou guano" : MONTHLY_PLAN[3].engrais.replace(" · ", ", ")}, par temps doux et sans gel. Une application sur la période.`);
    if (mois("engrais_ete").includes(m)) ajoute("☀️", naturel ? "Engrais organique d'été" : "Engrais d'été",
      `${naturel ? "Algues marines, acides humiques" : MONTHLY_PLAN[5].engrais.replace(" · ", ", ")}, jamais sur sol détrempé. Une application sur la période.`);
    if (mois("engrais_automne").includes(m)) ajoute("🍂", naturel ? "Engrais organique d'automne" : "Engrais d'automne",
      `${naturel ? "Engrais organique riche en potassium" : MONTHLY_PLAN[9].engrais.replace(" · ", ", ")}, pour préparer l'hiver. Une application sur la période.`);
    if (mois("engrais_hiver").includes(m) && profile?.sol !== "calcaire") ajoute("🧪", "Chaulage si sol acide", `${MONTHLY_PLAN[11].engrais.replace(" · ", ", ")}.`);
    const sc = scarif.includes(m), ae = aeration.includes(m);
    if (sc && ae) ajoute("🧹", "Scarification ou aération", "L'une OU l'autre, jamais les deux en même temps : scarification si feutre ou mousse, sinon aération.");
    else if (sc) ajoute("🧹", "Scarification", "Si feutre ou mousse.");
    else if (ae) ajoute("🌀", "Aération", "Améliore la pénétration de l'eau et de l'engrais.");
    if (mois("antimousse").includes(m)) ajoute("💊", "Anti-mousse, si mousse", "Sur les zones moussues seulement, puis ratisser la mousse morte.");
    if (mois("desherbage").includes(m)) ajoute("🪴", "Désherbage manuel", "Pissenlits et plantains arrachés avec leur racine, sol souple après une pluie.");
    if (mois("regarnissage").includes(m)) {
      const f = dansFenetre(m, z.printemps) ? z.printemps : dansFenetre(m, z.automne) ? z.automne : null;
      if (f) ajoute("🌾", "Regarnissage des zones clairsemées", `Fenêtre de semis de ta zone : du ${jourMois(f.debutPossible)} au ${jourMois(f.finOptimal)}. Le parcours Regarnissage te guide jour par jour.`);
    }
    if (m === 10 && profile?.sol !== "calcaire") ajoute("🧪", "Mesurer le pH du sol", "Début octobre, avec un test de jardinerie : sous pH 6, chauler à l'automne.");
    if (m >= 10) ajoute("🍂", "Ramasser les feuilles mortes", "Par temps sec : sous les feuilles, le gazon s'asphyxie et la mousse s'installe.");
    if (m === 10 || m === 11) ajoute("🚿", "Avant les premières gelées", hasArrosageAuto(profile)
      ? "Couper l'eau, purger le programmateur et les tuyaux enterrés." : "Vider et ranger tuyau, arroseur et programmateur à l'abri du gel.");
    if (m === 11) ajoute("🧰", "Hivernage du matériel", `${robot ? "Robot nettoyé et rangé au sec, batterie chargée selon la notice" : "Tondeuse nettoyée, lame vérifiée, rangée au sec"} : le guide « Hiverner sa tondeuse, son robot et son arrosage » détaille chaque geste.`);
    if (!l.length) ajoute("❄️", "Repos du gazon", "Rien à faire : l'app te prévient en cas de gel, de neige ou de problème à surveiller.");
    return l;
  };

  return {
    annee, zone: z.label, surface: profile?.surface || null,
    mois: MOIS.map((nom, i) => ({ num: i + 1, nom, items: items(i + 1) })),
  };
}

// Version imprimable (fenêtre « Enregistrer en PDF » du navigateur)
export function htmlPlanAnnuel(plan, prenom) {
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
  const mois = plan.mois.map(m => `<section><h2>${esc(m.nom[0].toUpperCase() + m.nom.slice(1))}</h2><ul>${m.items.map(i =>
    `<li><b>${i.icone} ${esc(i.titre)}</b><br/>${esc(i.detail)}</li>`).join("")}</ul></section>`).join("");
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><title>Plan annuel ${plan.annee} — Mongazon360</title>
<style>body{font-family:Arial,sans-serif;color:#1b3a24;margin:24px;font-size:12px}h1{font-size:22px;margin:0}
.sous{color:#4a7c5c;margin:4px 0 16px}section{break-inside:avoid;border-top:2px solid #43a047;padding:6px 0 4px;margin-top:10px}
h2{font-size:15px;margin:4px 0}ul{margin:0;padding-left:16px}li{margin:4px 0;line-height:1.45}
footer{margin-top:18px;color:#6b8f75;font-size:10px}</style></head><body>
<h1>🌿 Mon plan gazon ${plan.annee}${prenom ? ` — ${esc(prenom)}` : ""}</h1>
<div class="sous">Zone ${esc(plan.zone)}${plan.surface ? ` · ${plan.surface} m²` : ""} · dates indicatives : l'app ajuste chaque jour selon la météo</div>
${mois}<footer>Mongazon360® · mongazon360.fr · plan établi selon ton profil le ${new Date().toLocaleDateString("fr-FR")}</footer></body></html>`;
}
