// src/lib/selectionProduits.js
// Choix du produit du catalogue Amazon adapté au profil (gamme selon le budget, variante selon le gazon)
// et quantité selon la surface. Partagé par l'onglet Produits et le kit de saison.
import AMAZON_PRODUCTS from "./amazonProducts";

export const getBudgetTier = (budget) => {
  if (budget === "0-50" || budget === "inconnu") return "eco";
  if (budget === "50-150")  return "standard";
  if (budget === "150-300") return "qualite";
  if (budget === "300-600" || budget === "600+") return "premium";
  return "standard";
};

const calcQuantite = (surface, ratio, cond) => {
  if (!surface || !ratio || !cond) return 1;
  return Math.max(1, Math.ceil((surface * ratio) / cond));
};

export const selectProduit = (key, tier, profile) => {
  const cat = AMAZON_PRODUCTS[key];
  if (!cat) return null;
  if (key === "regarnissage" && tier === "qualite") {
    const variante =
      profile?.pelouse === "sport" ? "sport"
      : (profile?.exposition === "ombrage" || profile?.exposition === "mi-ombre") ? "ombre"
      : (profile?.zone === "sud" || profile?.zone === "sud_ouest") ? "secheresse"
      : "universel";
    return cat.tiers.qualite?.[variante] ?? cat.tiers.standard;
  }
  if (key === "tonte") {
    const surface  = profile?.surface || 100;
    const tierData = cat.tiers[tier] ?? cat.tiers.standard;
    if (Array.isArray(tierData)) {
      return tierData.find(p => (!p.surfaceMin || surface >= p.surfaceMin) && (!p.surfaceMax || surface <= p.surfaceMax)) || tierData[0];
    }
    return tierData;
  }
  return cat.tiers[tier] ?? cat.tiers.standard ?? cat.tiers.eco;
};

// Nombre de sacs / bidons pour la surface (1 pour le matériel)
export function quantitePour(cat, surface) {
  if (cat?.ratioGM2  && cat.conditionnement) return calcQuantite(surface, cat.ratioGM2,  cat.conditionnement);
  if (cat?.ratioMlM2 && cat.conditionnement) return calcQuantite(surface, cat.ratioMlM2, cat.conditionnement);
  return 1;
}
