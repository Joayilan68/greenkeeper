import Stripe from "stripe";
import { createClerkClient } from "@clerk/backend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const clerk  = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// ⚠️ Remplace par tes vrais Price IDs Stripe (créés dans ton dashboard Stripe)
const PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,   // ex: price_1Xxx...
  yearly:  process.env.STRIPE_PRICE_YEARLY,    // ex: price_1Yyy...
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const token   = req.headers.authorization?.replace("Bearer ", "");
    const { sub: userId } = await clerk.verifyToken(token);
    const { plan, email } = req.body;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: PRICES[plan] || PRICES.monthly, quantity: 1 }],
      customer_email: email,
      success_url: `${process.env.VITE_APP_URL}/subscribe/success`,
      cancel_url:  `${process.env.VITE_APP_URL}/subscribe`,
      metadata: { userId },
    });

    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
