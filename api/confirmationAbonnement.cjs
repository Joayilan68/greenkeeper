// api/confirmationAbonnement.cjs
// Email de confirmation d'un abonnement Premium (décision de Jordan du 16/11/2026), envoyé par le webhook Stripe après le
// paiement : récapitulatif (formule, montant payé, prochain renouvellement), résiliation, confirmation de la demande de
// fourniture immédiate et de la renonciation au droit de rétractation (article L. 221-13 du Code de la consommation),
// version des CGV acceptée et identité de l'éditeur (src/lib/editeur.json). Un échec ne bloque jamais Premium : il est
// signalé dans Pilotage → Bugs pour un envoi à la main.

const EDITEUR = require("../src/lib/editeur.json");

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const insecable = (v) => esc(v).replace(/ /g, "&nbsp;"); // SIRET, téléphone : jamais coupés en fin de ligne
const NOM_OFFRE = { hiver: "d'hiver", "été": "d'été" };
const euros = (centimes) => (centimes / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const dateLongue = (d) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

// session : session Checkout terminée (checkout.session.completed) ; abonnement : l'abonnement Stripe qu'elle a créé.
// Renvoie le message à envoyer par Resend, ou null sans adresse email.
function messageConfirmation(session, abonnement, prenom) {
  const email = session.customer_details?.email || session.customer_email;
  if (!email) return null;
  const annuel = session.metadata?.plan === "yearly";
  const offre = session.metadata?.offre?.startsWith("saison-") ? session.metadata.offre.slice(7) : null;
  const article = abonnement?.items?.data?.[0];
  const fin = article?.current_period_end ?? abonnement?.current_period_end;
  const prixRenouvellement = article?.price?.unit_amount;
  const versionCgv = session.metadata?.cgv_version;

  const ligne = (titre, valeur) => `<tr><td style="padding:6px 12px 6px 0;color:#5b6f61;vertical-align:top;white-space:nowrap">${titre}</td><td style="padding:6px 0;vertical-align:top">${valeur}</td></tr>`;
  const renouvellement = fin && prixRenouvellement != null
    ? `le ${dateLongue(new Date(fin * 1000))}, au prix de ${euros(prixRenouvellement)}${annuel ? " pour un an" : " pour un mois"}, sauf résiliation avant cette date`
    : (annuel ? "chaque année, sauf résiliation" : "chaque mois, sauf résiliation");

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1f2d24;line-height:1.6;max-width:600px">
<p>Bonjour${prenom ? ` ${esc(prenom)}` : ""},</p>
<p>Merci pour votre abonnement. <strong>Mongazon360 Premium est actif</strong> sur votre compte dès maintenant.</p>
<p style="font-weight:bold;margin:20px 0 4px">Votre commande</p>
<table style="border-collapse:collapse;font-size:14px">
${ligne("Formule", `Premium ${annuel ? "annuel" : "mensuel"}`)}
${ligne("Montant payé", `${euros(session.amount_total ?? 0)}${offre ? ` (tarif de la première année, offre ${esc(NOM_OFFRE[offre] || offre)})` : ""}`)}
${ligne("Date", dateLongue(new Date((session.created || Date.now() / 1000) * 1000)))}
${ligne("Renouvellement", renouvellement)}
</table>
<p style="font-weight:bold;margin:20px 0 4px">Résilier</p>
<p style="margin:0">À tout moment, sans préavis : dans l'app, <em>Paramètres → Gérer ou résilier mon abonnement</em>, ou par email à ${esc(EDITEUR.email)}. La résiliation prend effet à la fin de la période déjà payée : Premium reste actif jusque-là, puis votre compte repasse en compte gratuit, avec toutes vos données. Vos factures sont au même endroit, dans <em>Gérer ou résilier mon abonnement</em>.</p>
<p style="font-weight:bold;margin:20px 0 4px">Votre droit de rétractation</p>
<p style="margin:0">Lors de votre commande, vous avez demandé que Premium démarre dès le paiement et vous avez reconnu perdre ainsi votre droit de rétractation de 14 jours (article L. 221-28 du Code de la consommation ; CGV, article 8).</p>
<p style="font-weight:bold;margin:20px 0 4px">Vos conditions</p>
<p style="margin:0">Vous avez accepté nos <a href="https://mongazon360.fr/cgv" style="color:#2e7d32">conditions générales de vente</a>${versionCgv ? ` dans leur version du ${dateLongue(new Date(`${versionCgv}T12:00:00Z`))}` : ""}, avec les <a href="https://mongazon360.fr/cgu" style="color:#2e7d32">conditions générales d'utilisation</a> : garanties légales de conformité (CGV, article 9) et médiateur de la consommation (CGU, article 18).</p>
<p style="margin-top:20px">Bonne saison avec votre gazon,<br/>L'équipe Mongazon360</p>
<p style="color:#5b6f61;font-size:12px;margin-top:24px;border-top:1px solid #dfe8e1;padding-top:12px">Mongazon360® — ${esc(EDITEUR.nom)}, ${esc(EDITEUR.forme)} — SIRET ${insecable(EDITEUR.siret)}<br/>${esc(EDITEUR.adresse)} — ${esc(EDITEUR.email)} — ${insecable(EDITEUR.telephone)}<br/>TVA non applicable, article 293 B du Code général des impôts.</p>
</div>`;

  return {
    from: "Mongazon360 <bonjour@mongazon360.fr>",
    to: [email],
    reply_to: EDITEUR.email,
    subject: "Votre abonnement Mongazon360 Premium est actif",
    html,
  };
}

// Envoi par Resend ; la clé d'idempotence évite un 2e email si Stripe renvoie le même événement
async function envoyerConfirmation(stripe, session, prenom) {
  try {
    const abonnement = session.subscription ? await stripe.subscriptions.retrieve(session.subscription) : null;
    const message = messageConfirmation(session, abonnement, prenom);
    if (!message) throw new Error("adresse email absente de la session Stripe");
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `confirmation-${session.id}` },
      body: JSON.stringify(message),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.error) throw new Error("Resend : " + (d.error?.message || d.message || r.status));
  } catch (e) {
    await require("./alerting.cjs").reportServerError("Abonnement — email de confirmation non envoyé (à envoyer à la main)", e,
      { "Session Stripe": session.id, "Formule": session.metadata?.plan || "?" });
  }
}

module.exports = { messageConfirmation, envoyerConfirmation };
