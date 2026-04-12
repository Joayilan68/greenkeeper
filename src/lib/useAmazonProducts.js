// ─────────────────────────────────────────────────────────────────────────────
// useAmazonProducts.js — Hook de sélection produit Amazon
// Usage : const { produit, quantite, prixTotal } = useAmazonProducts('engraisStarter', profile)
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import AMAZON_PRODUCTS from './amazonProducts';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convertit le budget annuel (string onboarding ou number) en tier.
 * Adapter les seuils si les valeurs de l'onboarding ont changé.
 */
const getBudgetTier = (budgetAnnuel) => {
  // Gère les string ranges du profil onboarding : "0-50", "50-150", "150-300", "300-600", "600+"
  if (typeof budgetAnnuel === 'string') {
    if (budgetAnnuel === '0-50'  || budgetAnnuel === 'inconnu') return 'eco';
    if (budgetAnnuel === '50-150')  return 'standard';
    if (budgetAnnuel === '150-300') return 'qualite';
    if (budgetAnnuel === '300-600' || budgetAnnuel === '600+')  return 'premium';
  }
  // Fallback numérique
  const b = typeof budgetAnnuel === 'number' ? budgetAnnuel : parseInt(budgetAnnuel) || 0;
  if (b <= 50)  return 'eco';
  if (b <= 150) return 'standard';
  if (b <= 300) return 'qualite';
  return 'premium';
};

/**
 * Calcule le nombre d'unités (sacs/bidons) nécessaires pour couvrir la surface.
 * @param {number} surface - m²
 * @param {number} ratio   - g/m² ou ml/m²
 * @param {number} cond    - contenance d'un sac/bidon (g ou ml)
 */
const calcQuantite = (surface, ratio, cond) => {
  if (!surface || !ratio || !cond) return 1;
  return Math.max(1, Math.ceil((surface * ratio) / cond));
};

/**
 * Sélectionne la variante de semences qualité selon le profil utilisateur.
 */
const selectVarianteSemences = (profile) => {
  const { usage, exposition, region } = profile || {};
  if (usage === 'sport') return 'sport';
  if (exposition === 'ombre' || exposition === 'mi-ombre') return 'ombre';
  if (region === 'sud' || profile?.climatSecheresse) return 'secheresse';
  return 'universel';
};

/**
 * Sélectionne la bonne tondeuse depuis un tableau (selon surface).
 * Prend la première dont la plage de surface correspond, sinon la première.
 */
const selectTondeuseParSurface = (options, surface) => {
  if (!Array.isArray(options)) return options;
  return (
    options.find(
      (p) =>
        (!p.surfaceMin || surface >= p.surfaceMin) &&
        (!p.surfaceMax || surface <= p.surfaceMax)
    ) || options[0]
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HOOK PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} actionKey   - Clé du catalogue (ex: 'engraisStarter')
 * @param {object} profile     - Profil utilisateur (surface, budgetAnnuel, exposition…)
 * @returns {{ produit, quantite, prixTotal, tier, actionLabel, accessoires }}
 */
const useAmazonProducts = (actionKey, profile) => {
  const surface   = profile?.surface        || 100;
  const budget    = profile?.budgetAnnuel   ?? 0;
  const tier      = getBudgetTier(budget);

  return useMemo(() => {
    const catalogue = AMAZON_PRODUCTS[actionKey];
    if (!catalogue) return null;

    // ── Sélection du produit principal ──────────────────────────
    let produit = null;

    if (actionKey === 'regarnissage' && tier === 'qualite') {
      // Variante selon profil
      const variante = selectVarianteSemences(profile);
      produit = catalogue.tiers.qualite?.[variante] ?? catalogue.tiers.standard;

    } else if (actionKey === 'tonte') {
      // Tableau pour Standard/Qualité/Premium — sélection par surface
      const tierData = catalogue.tiers[tier] ?? catalogue.tiers.standard;
      produit = selectTondeuseParSurface(tierData, surface);

    } else {
      // Cas général : fallback vers standard si tier manquant
      produit =
        catalogue.tiers[tier] ??
        catalogue.tiers.standard ??
        catalogue.tiers.eco;
    }

    if (!produit) return null;

    // ── Calcul de la quantité (consommables uniquement) ──────────
    let quantite = 1;
    if (catalogue.ratioGM2 && catalogue.conditionnement) {
      quantite = calcQuantite(surface, catalogue.ratioGM2, catalogue.conditionnement);
    } else if (catalogue.ratioMlM2 && catalogue.conditionnement) {
      quantite = calcQuantite(surface, catalogue.ratioMlM2, catalogue.conditionnement);
    }

    const prixTotal = produit.prix * quantite;

    // ── Accessoires contextuels ──────────────────────────────────
    // Souffleur : proposé en sept-nov quel que soit le tier
    const moisCourant = new Date().getMonth() + 1; // 1-12
    const accessoires = [];
    if (actionKey === 'tonte' && catalogue.accessoires) {
      if (moisCourant >= 9 && moisCourant <= 11) {
        const souffleur =
          budget >= 150
            ? catalogue.accessoires.souffleur?.premium
            : catalogue.accessoires.souffleur?.standard;
        if (souffleur) accessoires.push({ ...souffleur, contexte: 'souffleur_automne' });
      }
    }

    return {
      produit,
      quantite,
      prixTotal,
      tier,
      surface,
      actionLabel: catalogue.label,
      accessoires,
    };
  }, [actionKey, surface, budget, tier, profile]);
};

// ─────────────────────────────────────────────────────────────────────────────
// TRACKING localStorage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enregistre un clic affilié Amazon en localStorage.
 * Appeler depuis le onClick du bouton "Voir sur Amazon".
 *
 * @param {string} actionKey  - Clé de l'action (ex: 'engraisStarter')
 * @param {string} asin       - ASIN du produit cliqué
 * @param {number} prixTotal  - Prix total affiché (quantite × prix unitaire)
 */
export const trackAmazonClick = (actionKey, asin, prixTotal) => {
  try {
    const clicks = JSON.parse(
      localStorage.getItem('mg360_amazon_clicks') || '[]'
    );
    clicks.push({
      ts:     new Date().toISOString(),
      action: actionKey,
      asin:   asin || 'fallback',
      prix:   prixTotal || 0,
    });
    localStorage.setItem('mg360_amazon_clicks', JSON.stringify(clicks));

    // Cumul budget dépensé par année (approximatif — pas d'achat confirmé)
    const spent = JSON.parse(
      localStorage.getItem('mg360_budget_spent') || '{}'
    );
    const year = new Date().getFullYear().toString();
    spent[year] = (spent[year] || 0) + (prixTotal || 0);
    localStorage.setItem('mg360_budget_spent', JSON.stringify(spent));
  } catch (e) {
    // Silencieux — ne jamais bloquer l'UX pour un tracking
    console.warn('[MG360] trackAmazonClick error:', e);
  }
};

export default useAmazonProducts;
