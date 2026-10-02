// api/webhook.js
// ─────────────────────────────────────────────────────────────────────────────
// Stripe webhook — vérification signature + activation/désactivation Premium + achat du plan annuel
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
    await require("./alerting.cjs").recordError({ source: "server", severity: "warning", kind: "Stripe — signature de webhook invalide", message: err.message });
    return res.status(400).json({ error: `Webhook signature invalide : ${err.message}` });
  }

  // ── Traitement des events ─────────────────────────────────────────────────
  try {
    switch (event.type) {

      // Paiement checkout réussi → plan annuel acheté, sinon activer Premium
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId  = session.metadata?.userId;
        if (!userId) break;

        if (session.metadata?.type === "plan_annuel") {
          if (session.payment_status !== "paid") break;
          await enregistrerPlanAnnuel(userId, Number(session.metadata.annee), session.customer_details?.email || session.customer_email);
          break;
        }

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
    await require("./alerting.cjs").reportServerError("Stripe — traitement du webhook en échec (abonnement non mis à jour ?)", err, { "Événement": event?.type || "?" });
    return res.status(500).json({ error: err.message });
  }

  res.json({ received: true });
};

// ── Plan annuel acheté : année ajoutée à publicMetadata.plansAnnuels (lu par la page /plan-annuel) + email ──
async function enregistrerPlanAnnuel(userId, annee, email) {
  const u = await clerk.users.getUser(userId);
  const plans = Array.isArray(u.publicMetadata?.plansAnnuels) ? u.publicMetadata.plansAnnuels : [];
  if (!plans.includes(annee)) {
    await clerk.users.updateUserMetadata(userId, { publicMetadata: { plansAnnuels: [...plans, annee] } });
  }
  console.log(`[Webhook] Plan annuel ${annee} acheté — user ${userId}`);
  if (!email) return;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "Mongazon360 <bonjour@mongazon360.fr>", to: [email],
        subject: `🌿 Ton plan gazon ${annee} est prêt`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1b3a24">
          <h2 style="color:#2e7d32">Merci ${u.firstName || ""} !</h2>
          <p>Ton plan annuel personnalisé ${annee} est prêt : les 12 mois d'entretien de ton gazon, selon ta zone, ton sol et ton type de gazon.</p>
          <p><a href="https://mongazon360.fr/plan-annuel" style="background:#2e7d32;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Voir mon plan ${annee}</a></p>
          <p style="font-size:12px;color:#4a7c5c">Dans l'app, le bouton « Enregistrer en PDF » te permet de le garder ou de l'imprimer.</p></div>`,
      }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}`);
  } catch (e) {
    await require("./alerting.cjs").reportServerError("Plan annuel — email de confirmation non envoyé", e, { "Utilisateur": userId });
  }
}

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
