// src/lib/kitSaison.js
// Kit de saison (onglet Produits) : les produits utiles pour la saison en cours, dans la gamme du
// budget et en quantité pour la surface du gazon. L'hiver prépare le printemps (achats de février).
import AMAZON_PRODUCTS from "./amazonProducts";
import { selectProduit, quantitePour } from "./selectionProduits";

const KITS = {
  automne:   { icone: "🍂", titre: "Kit d'automne",   sousTitre: "Nourrir, regarnir et chasser la mousse avant l'hiver", cles: ["engraisAutomne", "regarnissage", "antiMousse"] },
  hiver:     { icone: "❄️", titre: "Kit de fin d'hiver", sousTitre: "Prépare le printemps : chaulage (sol acide), scarification, engrais de démarrage", cles: ["engraisHiver", "verticut", "engraisStarter"] },
  printemps: { icone: "🌱", titre: "Kit de printemps", sousTitre: "Relancer la pousse, regarnir et désherber à la main", cles: ["engraisStarter", "regarnissage", "desherbage"] },
  ete:       { icone: "☀️", titre: "Kit d'été",        sousTitre: "Tenir la chaleur : engrais d'été et biostimulant", cles: ["engraisEte", "biostimulant"] },
};

// Produits appliqués seulement sur les zones abîmées (regarnissage, mousse) : ~30 % de la surface
const ZONES_A_TRAITER = { regarnissage: 0.3, antiMousse: 0.3 };

const saisonDuMois = (m) => m >= 9 && m <= 11 ? "automne" : m === 12 || m <= 2 ? "hiver" : m <= 5 ? "printemps" : "ete";
const aGazon = (p, t) => p?.pelouse === t || (Array.isArray(p?.gazons) && p.gazons.includes(t));

// Produits exclus selon le profil
function utile(cle, profile) {
  if (cle === "desherbage" && aGazon(profile, "rustique")) return false; // trèfle et fleurs acceptés
  if (cle === "engraisHiver" && profile?.sol === "calcaire") return false; // chaulage inutile sur sol calcaire
  return true;
}

export function kitDuMois(profile, tier, month = new Date().getMonth() + 1) {
  const saison = saisonDuMois(month);
  const kit = KITS[saison];
  const surface = profile?.surface || 100;
  const items = kit.cles.filter(cle => utile(cle, profile)).map(cle => {
    const cat = AMAZON_PRODUCTS[cle];
    const produit = selectProduit(cle, tier, profile);
    if (!cat || !produit) return null;
    const part = ZONES_A_TRAITER[cle];
    const quantite = quantitePour(cat, Math.round(surface * (part || 1)));
    return { cle, cat, produit, quantite, zones: !!part, prix: Math.round((produit.prix || 0) * quantite * 100) / 100 };
  }).filter(Boolean);
  const total = Math.round(items.reduce((t, i) => t + i.prix, 0) * 100) / 100;
  return { saison, ...kit, surface, items, total };
}
