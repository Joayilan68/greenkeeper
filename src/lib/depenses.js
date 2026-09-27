// src/lib/depenses.js
// Suivi des dépenses gazon (onglet Produits) : achats déclarés par l'utilisateur (Amazon ne dit
// jamais qui a acheté quoi), stockés dans le profil (profile.achats), comparés au budget annuel.
// Seule l'année en cours compte : le compteur repart de zéro au 1er janvier et les achats des
// années passées sont retirés au prochain enregistrement.

// Plafond de chaque tranche de budget du profil (Setup) ; « 600+ » et « inconnu » : pas de plafond
const PLAFONDS = { "0-50": 50, "50-150": 150, "150-300": 300, "300-600": 600 };

const anneeEnCours = () => String(new Date().getFullYear());

export const achatsAnnee = (profile) =>
  (Array.isArray(profile?.achats) ? profile.achats : []).filter(a => a.date?.startsWith(anneeEnCours()));

export const totalAnnee = (profile) =>
  Math.round(achatsAnnee(profile).reduce((s, a) => s + (Number(a.prix) || 0), 0) * 100) / 100;

export const plafondBudget = (profile) => PLAFONDS[profile?.budget] ?? null;

export const euros = (n) => {
  const v = Math.round(Number(n) * 100) / 100;
  const dec = Number.isInteger(v) ? 0 : 2;
  return `${v.toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec })} €`;
};

export function ajouterAchat(profile, { label, prix, cle = null, kit = null }) {
  const achat = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toLocaleDateString("fr-CA"), // AAAA-MM-JJ, heure locale
    label: String(label).trim().slice(0, 80),
    prix: Math.round(Number(prix) * 100) / 100,
    ...(cle ? { cle } : {}),
    ...(kit ? { kit } : {}), // saison du kit de saison noté d'un clic
  };
  return { ...profile, achats: [...achatsAnnee(profile), achat] };
}

export const retirerAchat = (profile, id) =>
  ({ ...profile, achats: achatsAnnee(profile).filter(a => a.id !== id) });
