const Stripe = require("stripe");
const { createClerkClient } = require("@clerk/backend");

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

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
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token       = authHeader.replace("Bearer ", "");
        const parts       = token.split(".");
        const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
        const payload     = JSON.parse(payloadJson);
        userId = payload.sub || payload.user_id;
      } catch (e) {
        console.warn("[Checkout] Token decode error:", e.message);
      }
    }

    const PRICES = {
      monthly: process.env.STRIPE_PRICE_MONTHLY,
      yearly:  process.env.STRIPE_PRICE_YEARLY,
    };
    const priceId = PRICES[plan] || PRICES.monthly;
    if (!priceId) throw new Error("Price ID manquant");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      // ✅ userId Clerk dans les metadata — utilisé par le webhook pour activer Premium
      metadata: {
        userId: userId || "",
        plan,
      },
      subscription_data: {
        metadata: {
          userId: userId || "",
          plan,
        },
      },
      success_url: `${process.env.VITE_APP_URL}/subscribe/success`,
      cancel_url:  `${process.env.VITE_APP_URL}/subscribe`,
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error("Erreur checkout:", e.message);
    res.status(500).json({ error: e.message });
  }
};
