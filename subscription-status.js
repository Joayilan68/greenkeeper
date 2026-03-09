import Stripe from "stripe";
import { createClerkClient } from "@clerk/backend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const clerk  = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  try {
    const token  = req.headers.authorization?.replace("Bearer ", "");
    const { sub: userId } = await clerk.verifyToken(token);
    const user   = await clerk.users.getUser(userId);
    const email  = user.emailAddresses[0]?.emailAddress;

    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) return res.json({ isSubscribed: false });

    const subs = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "active",
      limit: 1,
    });
    res.json({ isSubscribed: subs.data.length > 0 });
  } catch (e) {
    res.status(401).json({ isSubscribed: false, error: e.message });
  }
}
