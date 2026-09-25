const Stripe = require("stripe");
const { verifiedUserId } = require("./auth.cjs");
const { offreEnCours, couponSaison } = require("./offreSaison.cjs");

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

    const PRICES = {
      monthly: process.env.STRIPE_PRICE_MONTHLY,
      yearly:  process.env.STRIPE_PRICE_YEARLY,
    };
    const priceId = PRICES[plan] || PRICES.monthly;
    if (!priceId) throw new Error("Price ID manquant");

    // Offre saisonnière : annuel à 19,99 € la 1re année pendant les périodes creuses
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
