// ─────────────────────────────────────────────────────────────────────────────
// ProductCard.jsx — Carte produit Amazon affilié
//
// Usage standard (dans Today.jsx / MyLawn.jsx) :
//   <ProductCard actionKey="engraisStarter" profile={profile} />
//
// Usage compact (dans une liste d'actions) :
//   <ProductCard actionKey="verticut" profile={profile} compact />
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import useAmazonProducts, { trackAmazonClick } from '../lib/useAmazonProducts';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const TIER_LABELS = {
  eco:      'Économique',
  standard: 'Standard',
  qualite:  'Qualité',
  premium:  'Premium',
};

const TIER_COLORS = {
  eco:      '#6B7280', // gris
  standard: '#16A34A', // vert
  qualite:  '#2563EB', // bleu
  premium:  '#D97706', // amber
};

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANT : Bouton Amazon
// ─────────────────────────────────────────────────────────────────────────────

const AmazonBtn = ({ onClick, label, small = false }) => (
  <button
    onClick={onClick}
    aria-label={label}
    style={{
      display:         'flex',
      alignItems:      'center',
      gap:             '6px',
      backgroundColor: '#FF9900',
      color:           '#111',
      border:          'none',
      borderRadius:    '8px',
      padding:         small ? '6px 12px' : '10px 18px',
      fontSize:        small ? '13px' : '15px',
      fontWeight:      '600',
      cursor:          'pointer',
      width:           small ? 'auto' : '100%',
      justifyContent:  'center',
      transition:      'background-color 0.15s',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e68900')}
    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FF9900')}
  >
    <span style={{ fontSize: small ? '14px' : '16px' }}>🛒</span>
    Voir sur Amazon
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string}  actionKey   - Clé du catalogue Amazon (ex: 'engraisStarter')
 * @param {object}  profile     - Profil utilisateur complet
 * @param {boolean} compact     - Mode compact (liste), sinon mode carte complète
 * @param {string}  className   - Classe CSS additionnelle
 */
const ProductCard = ({ actionKey, profile, compact = false, className = '' }) => {
  const result = useAmazonProducts(actionKey, profile);

  if (!result || !result.produit) return null;

  const { produit, quantite, prixTotal, tier, surface, actionLabel, accessoires } = result;

  const handleClick = () => {
    trackAmazonClick(actionKey, produit.asin, prixTotal);
    window.open(produit.url, '_blank', 'noopener,noreferrer');
  };

  const tierLabel = TIER_LABELS[tier] || tier;
  const tierColor = TIER_COLORS[tier] || '#16A34A';
  const isMateriel = !quantite || quantite === 1;

  // ── MODE COMPACT ─────────────────────────────────────────────
  if (compact) {
    return (
      <div
        className={`mg360-product-compact ${className}`}
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            '10px',
          padding:        '10px 14px',
          backgroundColor: 'rgba(102,187,106,0.08)',
          borderRadius:   '10px',
          border:         '1px solid rgba(102,187,106,0.22)',
          flexWrap:       'wrap',
        }}
      >
        <span
          style={{
            fontSize:        '11px',
            fontWeight:      '700',
            color:           tierColor,
            textTransform:   'uppercase',
            letterSpacing:   '0.05em',
            whiteSpace:      'nowrap',
          }}
        >
          {tierLabel}
        </span>

        <span style={{ fontSize: '13px', color: '#c8e6c9', flex: 1 }}>
          {produit.label}
        </span>

        {quantite > 1 && (
          <span style={{ fontSize: '13px', color: '#81c784', whiteSpace: 'nowrap' }}>
            ×{quantite}
          </span>
        )}



        <AmazonBtn
          onClick={handleClick}
          label={`Acheter ${produit.label} sur Amazon`}
          small
        />
      </div>
    );
  }

  // ── MODE CARTE COMPLÈTE ──────────────────────────────────────
  return (
    <div
      className={`mg360-product-card ${className}`}
      style={{
        backgroundColor: 'rgba(15,47,31,0.85)',
        borderRadius:    '14px',
        border:          '1px solid rgba(102,187,106,0.25)',
        padding:         '16px',
        boxShadow:       '0 2px 8px rgba(0,0,0,0.2)',
        display:         'flex',
        flexDirection:   'column',
        gap:             '12px',
      }}
    >
      {/* En-tête : tier badge + marque */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize:        '11px',
            fontWeight:      '700',
            color:           '#FFFFFF',
            backgroundColor: tierColor,
            borderRadius:    '6px',
            padding:         '3px 9px',
            textTransform:   'uppercase',
            letterSpacing:   '0.06em',
          }}
        >
          {tierLabel}
        </span>
        <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{produit.marque}</span>
      </div>

      {/* Nom du produit */}
      <p style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#e8f5e9', lineHeight: 1.4 }}>
        {produit.label}
      </p>

      {/* Calcul quantité pour consommables */}
      {quantite > 1 && (
        <div
          style={{
            backgroundColor: 'rgba(102,187,106,0.12)',
            borderRadius:    '8px',
            padding:         '8px 12px',
            fontSize:        '13px',
            color:           '#81c784',
          }}
        >
          🌱 Pour votre gazon de <strong>{surface} m²</strong> :{' '}
          <strong>{quantite} unité{quantite > 1 ? 's' : ''}</strong> nécessaire{quantite > 1 ? 's' : ''}
        </div>
      )}



      {/* Bouton Amazon */}
      <AmazonBtn
        onClick={handleClick}
        label={`Acheter ${produit.label} sur Amazon`}
      />

      {/* Disclaimer affilié */}
      <p
        style={{
          margin:    0,
          fontSize:  '11px',
          color:     'rgba(165,214,167,0.5)',
          textAlign: 'center',
          lineHeight: 1.4,
        }}
      >
        Lien partenaire Amazon • Prix indicatif, peut varier
      </p>

      {/* Accessoires contextuels (ex: souffleur en automne) */}
      {accessoires?.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(102,187,106,0.2)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#81c784', fontWeight: '600' }}>
            💡 À avoir aussi
          </p>
          {accessoires.map((acc) => (
            <div
              key={acc.asin || acc.label}
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                gap:            '8px',
                flexWrap:       'wrap',
              }}
            >
              <span style={{ fontSize: '13px', color: '#c8e6c9', flex: 1 }}>{acc.label}</span>
              <button
                onClick={() => {
                  trackAmazonClick(`${actionKey}_accessoire`, acc.asin, acc.prix);
                  window.open(acc.url, '_blank', 'noopener,noreferrer');
                }}
                style={{
                  fontSize:        '12px',
                  color:           '#FF9900',
                  background:      'none',
                  border:          '1px solid #FF9900',
                  borderRadius:    '6px',
                  padding:         '4px 10px',
                  cursor:          'pointer',
                  fontWeight:      '600',
                  whiteSpace:      'nowrap',
                }}
              >
                Voir →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductCard;
