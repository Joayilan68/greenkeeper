// api/webhook.js
// ─────────────────────────────────────────────────────────────────────────────
// Stripe webhook — vérification signature + activation/désactivation Premium
// Events : checkout.session.completed · subscription.updated · subscription.deleted
// ─────────────────────────────────────────────────────────────────────────────

const Stripe = require("stripe");
const { createClerkClient } = require("@clerk/backend");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const clerk  = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// ── Désactiver le body parsing automatique de Vercel ─────────────────────────
// Stripe a besoin du raw body pour vérifier la signature
export const config = { api: { bodyParser: false } };

// ── Lire le raw body ──────────────────────────────────────────────────────────
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end",  ()    => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sig     = req.headers["stripe-signature"];
  const secret  = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("[Webhook] Signature invalide :", err.message);
    return res.status(400).json({ error: `Webhook signature invalide : ${err.message}` });
  }

  // ── Traitement des events ─────────────────────────────────────────────────
  try {
    switch (event.type) {

      // Paiement checkout réussi → activer Premium
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId  = session.metadata?.userId;
        if (!userId) break;

        await clerk.users.updateUserMetadata(userId, {
          publicMetadata: { isSubscribed: true, subscriptionStatus: "active" },
        });
        console.log(`[Webhook] Premium activé — user ${userId}`);
        break;
      }

      // Abonnement mis à jour (renouvellement, changement de plan)
      case "customer.subscription.updated": {
        const sub    = event.data.object;
        const userId = sub.metadata?.userId || await getUserIdFromCustomer(sub.customer);
        if (!userId) break;

        const actif = ["active", "trialing"].includes(sub.status);
        await clerk.users.updateUserMetadata(userId, {
          publicMetadata: { isSubscribed: actif, subscriptionStatus: sub.status },
        });
        console.log(`[Webhook] Subscription updated — user ${userId} — status ${sub.status}`);
        break;
      }

      // Abonnement annulé/expiré → désactiver Premium
      case "customer.subscription.deleted": {
        const sub    = event.data.object;
        const userId = sub.metadata?.userId || await getUserIdFromCustomer(sub.customer);
        if (!userId) break;

        await clerk.users.updateUserMetadata(userId, {
          publicMetadata: { isSubscribed: false, subscriptionStatus: "canceled" },
        });
        console.log(`[Webhook] Premium désactivé — user ${userId}`);
        break;
      }

      default:
        // Event non géré — on ignore silencieusement
        break;
    }
  } catch (err) {
    console.error("[Webhook] Erreur traitement :", err.message);
    return res.status(500).json({ error: err.message });
  }

  res.json({ received: true });
};

// ── Helper : retrouver le userId Clerk depuis un customer Stripe ──────────────
async function getUserIdFromCustomer(customerId) {
  if (!customerId) return null;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    // On stocke le userId Clerk dans les metadata du customer Stripe lors du checkout
    return customer.metadata?.userId || null;
  } catch {
    return null;
  }
}
