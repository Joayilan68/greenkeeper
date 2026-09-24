// src/lib/charges.js
// Charges de Mongazon360 — source unique de l'onglet Pilotage → Finances.
// À tenir à jour à chaque souscription, résiliation ou changement de tarif.
// period : "mois" | "an" · currency : "EUR" | "USD" (converti au taux indicatif ci-dessous)

export const USD_EUR = 0.86; // taux indicatif — à ajuster si l'écart devient significatif

// Charges en cours (incluses dans le résultat)
export const CHARGES_ACTIVES = [
  { name: "Open-Meteo",  role: "Météo, sol, ET₀ — licence commerciale Standard", amount: 29, currency: "USD", period: "mois" },
  { name: "OVH",         role: "Domaines mongazon360.fr + .com",                 amount: 17, currency: "EUR", period: "an" },
  { name: "Shine",       role: "Compte bancaire professionnel",                  amount: 0,  currency: "EUR", period: "mois", note: "à confirmer selon l'offre (0 à 9 €/mois)" },
  { name: "Vercel",      role: "Hébergement + mesure d'audience",                amount: 0,  currency: "EUR", period: "mois", note: "palier gratuit (Hobby)" },
  { name: "Supabase",    role: "Base de données",                                amount: 0,  currency: "EUR", period: "mois", note: "palier gratuit (500 Mo)" },
  { name: "Clerk",       role: "Authentification",                               amount: 0,  currency: "EUR", period: "mois", note: "palier gratuit" },
  { name: "Groq",        role: "IA (diagnostic, Bob, recommandations)",          amount: 0,  currency: "EUR", period: "mois", note: "palier gratuit" },
  { name: "Cloudinary",  role: "Photos de diagnostic",                           amount: 0,  currency: "EUR", period: "mois", note: "palier gratuit" },
  { name: "Resend",      role: "Emails",                                         amount: 0,  currency: "EUR", period: "mois", note: "palier gratuit" },
];

// Charges proportionnelles au chiffre d'affaires
export const STRIPE_FEES   = { pct: 0.015, fixed: 0.25 }; // par paiement (cartes UE)
export const URSSAF_RATE   = 0.221;                       // micro-entrepreneur, APE 6201Z (suivi de projet)

// Charges prévues (NON incluses dans le résultat — affichées pour anticiper)
export const CHARGES_PREVUES = [
  { name: "RC Pro numérique",         role: "Assurance — devis en cours (Hiscox / Stello / April)", amount: 150, currency: "EUR", period: "an" },
  { name: "Apple Developer",          role: "Publication iOS — si GO de l'étude Apple",             amount: 99,  currency: "USD", period: "an" },
  { name: "Codemagic",                role: "Build iOS sans Mac — si GO de l'étude Apple",          amount: 30,  currency: "USD", period: "mois" },
];

// Montant en € pour la période demandée ("mois" | "an")
export function montant(c, periode) {
  const eur = c.currency === "USD" ? c.amount * USD_EUR : c.amount;
  if (c.period === periode) return eur;
  return periode === "an" ? eur * 12 : eur / 12;
}
