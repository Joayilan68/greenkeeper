// api/confirmationAbonnement.cjs
// Emails de l'abonnement Premium, envoyés par le webhook Stripe (décisions de Jordan du 16/11/2026) :
// - confirmation après le paiement : récapitulatif (formule, montant payé, prochain renouvellement), résiliation,
//   confirmation de la demande de fourniture immédiate et de la renonciation au droit de rétractation (article L. 221-13
//   du Code de la consommation), version des CGV acceptée ;
// - confirmation de la résiliation (article L. 215-1-1) : date de la demande, date de fin et effets.
// Identité de l'éditeur : src/lib/editeur.json. Un échec ne bloque jamais l'abonnement : il est signalé dans Pilotage →
// Bugs pour un envoi à la main.

const EDITEUR = require("../src/lib/editeur.json");

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const insecable = (v) => esc(v).replace(/ /g, "&nbsp;"); // SIRET, téléphone : jamais coupés en fin de ligne
const NOM_OFFRE = { hiver: "d'hiver", "été": "d'été" };
const euros = (centimes) => (centimes / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const dateLongue = (d) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
const dateUnix = (s) => dateLongue(new Date(s * 1000));

const titre = (t) => `<p style="font-weight:bold;margin:20px 0 4px">${t}</p>`;
const ligne = (t, valeur) => `<tr><td style="padding:6px 12px 6px 0;color:#5b6f61;vertical-align:top;white-space:nowrap">${t}</td><td style="padding:6px 0;vertical-align:top">${valeur}</td></tr>`;
const message = (email, sujet, prenom, corps) => ({
  from: "Mongazon360 <bonjour@mongazon360.fr>",
  to: [email],
  reply_to: EDITEUR.email,
  subject: sujet,
  html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1f2d24;line-height:1.6;max-width:600px">
<p>Bonjour${prenom ? ` ${esc(prenom)}` : ""},</p>
${corps}
<p style="color:#5b6f61;font-size:12px;margin-top:24px;border-top:1px solid #dfe8e1;padding-top:12px">Mongazon360® — ${esc(EDITEUR.nom)}, ${esc(EDITEUR.forme)} — SIRET ${insecable(EDITEUR.siret)}<br/>${esc(EDITEUR.adresse)} — ${esc(EDITEUR.email)} — ${insecable(EDITEUR.telephone)}<br/>TVA non applicable, article 293 B du Code général des impôts.</p>
</div>`,
});
const formule = (sub, plan) => (plan || sub?.metadata?.plan) === "yearly" || sub?.items?.data?.[0]?.price?.recurring?.interval === "year" ? "annuel" : "mensuel";
const finPeriode = (sub) => sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end;

// session : session Checkout terminée (checkout.session.completed) ; abonnement : l'abonnement Stripe qu'elle a créé.
// Renvoie le message à envoyer par Resend, ou null sans adresse email.
function messageConfirmation(session, abonnement, prenom) {
  const email = session.customer_details?.email || session.customer_email;
  if (!email) return null;
  const annuel = formule(abonnement, session.metadata?.plan) === "annuel";
  const offre = session.metadata?.offre?.startsWith("saison-") ? session.metadata.offre.slice(7) : null;
  const fin = finPeriode(abonnement);
  const prixRenouvellement = abonnement?.items?.data?.[0]?.price?.unit_amount;
  const versionCgv = session.metadata?.cgv_version;
  const renouvellement = fin && prixRenouvellement != null
    ? `le ${dateUnix(fin)}, au prix de ${euros(prixRenouvellement)}${annuel ? " pour un an" : " pour un mois"}, sauf résiliation avant cette date`
    : (annuel ? "chaque année, sauf résiliation" : "chaque mois, sauf résiliation");

  return message(email, "Votre abonnement Mongazon360 Premium est actif", prenom, `<p>Merci pour votre abonnement. <strong>Mongazon360 Premium est actif</strong> sur votre compte dès maintenant.</p>
${titre("Votre commande")}
<table style="border-collapse:collapse;font-size:14px">
${ligne("Formule", `Premium ${annuel ? "annuel" : "mensuel"}`)}
${ligne("Montant payé", `${euros(session.amount_total ?? 0)}${offre ? ` (tarif de la première année, offre ${esc(NOM_OFFRE[offre] || offre)})` : ""}`)}
${ligne("Date", dateUnix(session.created || Date.now() / 1000))}
${ligne("Renouvellement", renouvellement)}
</table>
${titre("Résilier")}
<p style="margin:0">À tout moment, sans préavis : dans l'app, <em>Paramètres → Gérer ou résilier mon abonnement</em>, ou par email à ${esc(EDITEUR.email)}. La résiliation prend effet à la fin de la période déjà payée : Premium reste actif jusque-là, puis votre compte repasse en compte gratuit, avec toutes vos données. Vos factures sont au même endroit, dans <em>Gérer ou résilier mon abonnement</em>.</p>
${titre("Votre droit de rétractation")}
<p style="margin:0">Lors de votre commande, vous avez demandé que Premium démarre dès le paiement et vous avez reconnu perdre ainsi votre droit de rétractation de 14 jours (article L. 221-28 du Code de la consommation ; CGV, article 8).</p>
${titre("Vos conditions")}
<p style="margin:0">Vous avez accepté nos <a href="https://mongazon360.fr/cgv" style="color:#2e7d32">conditions générales de vente</a>${versionCgv ? ` dans leur version du ${dateLongue(new Date(`${versionCgv}T12:00:00Z`))}` : ""}, avec les <a href="https://mongazon360.fr/cgu" style="color:#2e7d32">conditions générales d'utilisation</a> : garanties légales de conformité (CGV, article 9) et médiateur de la consommation (CGU, article 18).</p>
<p style="margin-top:20px">Bonne saison avec votre gazon,<br/>L'équipe Mongazon360</p>`);
}

// Résiliation demandée (customer.subscription.updated) : l'abonnement s'arrête à la fin de la période payée. Résiliation
// immédiate (customer.subscription.deleted, à la demande du client) : Premium s'arrête le jour même.
function messageResiliation(sub, email, prenom, immediate) {
  if (!email) return null;
  const demande = sub.canceled_at || Date.now() / 1000;
  const fin = immediate ? (sub.ended_at || demande) : (sub.cancel_at || finPeriode(sub));
  const effets = immediate
    ? `<p style="margin:0">Votre abonnement Premium ${formule(sub)} est <strong>résilié depuis le ${dateUnix(fin)}</strong>. Votre compte est repassé en compte gratuit, avec toutes vos données. Aucun autre paiement ne sera prélevé.</p>`
    : `<p style="margin:0">Votre abonnement Premium ${formule(sub)} prendra fin le <strong>${dateUnix(fin)}</strong>, à la fin de la période déjà payée : Premium reste actif jusque-là. Ensuite, votre compte repassera en compte gratuit, avec toutes vos données. Aucun autre paiement ne sera prélevé.</p>`;
  return message(email, "Votre résiliation Mongazon360 Premium est enregistrée", prenom, `<p>Nous avons bien reçu votre demande de résiliation le ${dateUnix(demande)}.</p>
${effets}
<p>${immediate ? "Vous pouvez reprendre Premium à tout moment" : "Après cette date, vous pourrez reprendre Premium à tout moment"} depuis <em>Choisir son niveau</em> dans l'app. Une question : écrivez-nous à ${esc(EDITEUR.email)}.</p>
<p style="margin-top:20px">Merci d'avoir choisi Premium,<br/>L'équipe Mongazon360</p>`);
}

// Envoi par Resend ; la clé d'idempotence évite un 2e email si Stripe renvoie le même événement
async function envoyer(m, cle) {
  if (!m) throw new Error("adresse email du client absente chez Stripe");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": cle },
    body: JSON.stringify(m),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error("Resend : " + (d.error?.message || d.message || r.status));
}

async function envoyerConfirmation(stripe, session, prenom) {
  try {
    const abonnement = session.subscription ? await stripe.subscriptions.retrieve(session.subscription) : null;
    await envoyer(messageConfirmation(session, abonnement, prenom), `confirmation-${session.id}`);
  } catch (e) {
    await require("./alerting.cjs").reportServerError("Abonnement — email de confirmation non envoyé (à envoyer à la main)", e,
      { "Session Stripe": session.id, "Formule": session.metadata?.plan || "?" });
  }
}

async function envoyerResiliation(stripe, sub, prenom, immediate) {
  try {
    const client = sub.customer ? await stripe.customers.retrieve(sub.customer) : null;
    await envoyer(messageResiliation(sub, client?.email, prenom, immediate), `resiliation-${sub.id}-${sub.canceled_at || "immediate"}`);
  } catch (e) {
    await require("./alerting.cjs").reportServerError("Abonnement — email de confirmation de résiliation non envoyé (à envoyer à la main)", e,
      { "Abonnement Stripe": sub.id, "Formule": formule(sub) });
  }
}

// La résiliation vient d'être demandée : fin de période programmée (cancel_at_period_end, ou cancel_at selon la version de
// l'API Stripe), absente avant l'événement
const resiliationDemandee = (sub, avant = {}) =>
  (sub.cancel_at_period_end === true && avant.cancel_at_period_end === false) || (!!sub.cancel_at && "cancel_at" in avant && !avant.cancel_at);
// Abonnement arrêté tout de suite à la demande du client (et non à la fin d'une période déjà annoncée, ni après un impayé)
const resiliationImmediate = (sub) =>
  sub.cancellation_details?.reason === "cancellation_requested" && !!sub.canceled_at && Math.abs((sub.ended_at || 0) - sub.canceled_at) < 600;

module.exports = { messageConfirmation, messageResiliation, envoyerConfirmation, envoyerResiliation, resiliationDemandee, resiliationImmediate };
