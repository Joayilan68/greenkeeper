const Stripe = require("stripe");
const { verifiedUserId } = require("./auth.cjs");
const { OFFRE, offreEnCours, couponSaison } = require("./offreSaison.cjs");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { plan, email } = req.body;

    // ── Extraire userId depuis le token Clerk ─────────────────────────────
    const userId = await verifiedUserId(req);

    // Plan annuel personnalisé : achat unique (0,99 €), plan de l'année suivante à partir d'octobre
    // (même règle que src/lib/planAnnuel.js) ; enregistré par le webhook, sans toucher à l'abonnement
    if (plan === "plan_annuel") {
      if (!userId) return res.status(401).json({ error: "Connexion requise" });
      const now = new Date();
      const annee = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
      const metadata = { userId, type: "plan_annuel", annee: String(annee) };
      const achat = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: 99,
          product_data: { name: `Plan annuel personnalisé Mongazon360 ${annee}` } } }],
        customer_email: email,
        metadata,
        payment_intent_data: { metadata },
        success_url: `${process.env.VITE_APP_URL}/plan-annuel?achat=ok`,
        cancel_url:  `${process.env.VITE_APP_URL}/plan-annuel`,
      });
      return res.json({ url: achat.url });
    }

    const PRICES = {
      monthly: process.env.STRIPE_PRICE_MONTHLY,
      yearly:  process.env.STRIPE_PRICE_YEARLY,
    };
    const priceId = PRICES[plan] || PRICES.monthly;
    if (!priceId) throw new Error("Price ID manquant");

    // Le montant facturé doit être celui affiché dans l'app (src/lib/offreSaison.json) : un identifiant de prix resté
    // sur un ancien tarif dans Vercel bloque l'abonnement au lieu de facturer un autre montant
    const attendu = Math.round((plan === "yearly" ? OFFRE.prixAnnuel : OFFRE.prixMensuel) * 100);
    const { unit_amount } = await stripe.prices.retrieve(priceId);
    if (unit_amount !== attendu) {
      await require("./alerting.cjs").reportServerError("Paiement — prix Stripe différent du prix affiché",
        new Error(`${unit_amount} centimes au lieu de ${attendu}`), { "Formule": plan });
      return res.status(503).json({ error: "L'abonnement est momentanément indisponible. Merci de réessayer dans quelques minutes." });
    }

    // Offre saisonnière : annuel à prix réduit la 1re année pendant les périodes creuses
    const offre = plan === "yearly" && offreEnCours();
    const discounts = offre ? [{ coupon: await couponSaison(stripe) }] : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      ...(discounts ? { discounts } : {}),
      customer_email: email,
      // ✅ userId Clerk dans les metadata — utilisé par le webhook pour activer Premium
      metadata: {
        userId: userId || "",
        plan,
        ...(offre ? { offre: `saison-${offre.nom}` } : {}),
      },
      subscription_data: {
        metadata: {
          userId: userId || "",
          plan,
          ...(offre ? { offre: `saison-${offre.nom}` } : {}),
        },
      },
      success_url: `${process.env.VITE_APP_URL}/subscribe/success`,
      cancel_url:  `${process.env.VITE_APP_URL}/subscribe`,
    });

    res.json({ url: session.url });
  } catch (e) {
    await require("./alerting.cjs").reportServerError("Paiement — création de session Stripe en échec", e);
    res.status(500).json({ error: e.message });
  }
};
