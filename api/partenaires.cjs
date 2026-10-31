// api/partenaires.cjs — paysagistes partenaires (décision de Jordan du 31/10/2026, CLAUDE.md « Paysagistes partenaires ») :
// formulaire de la page /partenaires → demande enregistrée (table partenaires_demandes, serveur uniquement), email à
// contact@mongazon360.fr (« répondre » va directement à l'entreprise) et accusé de réception à l'entreprise.
// Partenaires = fournisseurs de leads payants (au contact, puis commission au contrat signé) : tarifs envoyés avec la réponse.
// POST /api/send?type=partenaire   corps : { entreprise, siret, contact, email, telephone, code_postal, rayon_km,
//   services[], message, source, campagne, piege, duree }
// Anti-robots : « piege » (champ caché) rempli ou formulaire envoyé moins de 3 s après l'ouverture de la page (« duree », ms)
// → réponse « ok » sans rien enregistrer ; 20 demandes par heure au plus (l'accusé de réception ne doit pas servir à
// envoyer des emails en masse).
const { reportServerError } = require("./alerting.cjs");
const SERVICES = require("../src/lib/servicesPartenaires.json");

const BOITE = "contact@mongazon360.fr";
const MAX_PAR_HEURE = 20;

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const texte = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// Contrôle des champs : renvoie { demande } ou { erreur } (message lisible par l'entreprise)
function verifier(b) {
  const d = {
    entreprise: texte(b.entreprise, 120),
    siret: texte(b.siret, 20).replace(/\s/g, ""),
    contact: texte(b.contact, 80),
    email: texte(b.email, 120).toLowerCase(),
    telephone: texte(b.telephone, 25),
    code_postal: texte(b.code_postal, 5),
    rayon_km: Math.round(Number(b.rayon_km)) || null,
    services: [...new Set(Array.isArray(b.services) ? b.services.filter(s => SERVICES[s]) : [])],
    message: String(b.message ?? "").trim().slice(0, 1500) || null,
    source: texte(b.source, 40) || null,
    campagne: texte(b.campagne, 80) || null,
  };
  if (d.entreprise.length < 2) return { erreur: "Indiquez le nom de l'entreprise." };
  if (d.contact.length < 2) return { erreur: "Indiquez le nom de la personne à contacter." };
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(d.email)) return { erreur: "L'adresse email semble incorrecte." };
  if (!/^\+?[\d .-]{10,20}$/.test(d.telephone)) return { erreur: "Le numéro de téléphone semble incorrect." };
  if (!/^\d{5}$/.test(d.code_postal)) return { erreur: "Le code postal doit compter 5 chiffres." };
  if (d.siret && !/^\d{14}$/.test(d.siret)) return { erreur: "Le SIRET doit compter 14 chiffres." };
  if (d.rayon_km !== null && (d.rayon_km < 1 || d.rayon_km > 300)) return { erreur: "Le rayon d'intervention doit être compris entre 1 et 300 km." };
  if (!d.services.length) return { erreur: "Cochez au moins un service." };
  return { demande: { ...d, siret: d.siret || null } };
}

async function envoyerEmail(corps) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify(corps),
  });
  if (!r.ok) throw new Error(`Resend ${r.status} : ${(await r.text()).slice(0, 200)}`);
}

const ligne = (titre, valeur) => `<tr><td style="padding:6px 12px 6px 0;color:#5b6f61;white-space:nowrap;vertical-align:top">${titre}</td><td style="padding:6px 0">${valeur}</td></tr>`;

function emailInterne(d) {
  const services = d.services.map(s => esc(SERVICES[s])).join("<br/>");
  const origine = [d.source, d.campagne].filter(Boolean).map(esc).join(" · ") || "direct";
  return {
    from: "Mongazon360 Partenaires <bonjour@mongazon360.fr>",
    to: [BOITE],
    reply_to: d.email,
    subject: `🌿 Demande de partenariat : ${d.entreprise} (${d.code_postal})`,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2d24;max-width:600px">
<h2 style="color:#1a4731;margin:0 0 12px">Nouvelle demande de partenariat</h2>
<table style="border-collapse:collapse">${[
      ligne("Entreprise", esc(d.entreprise)),
      ligne("SIRET", esc(d.siret || "non indiqué")),
      ligne("Contact", esc(d.contact)),
      ligne("Email", `<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>`),
      ligne("Téléphone", esc(d.telephone)),
      ligne("Zone", `${esc(d.code_postal)}${d.rayon_km ? `, ${d.rayon_km} km autour` : ""}`),
      ligne("Services", services),
      ligne("Message", d.message ? esc(d.message).replace(/\n/g, "<br/>") : "—"),
      ligne("Arrivée par", origine),
    ].join("")}</table>
<p style="color:#5b6f61;font-size:12px;margin-top:16px">Répondez directement à cet email : la réponse part à l'entreprise. Pensez à joindre nos conditions et nos tarifs.</p></div>`,
  };
}

function accuseReception(d) {
  return {
    from: "Mongazon360 <bonjour@mongazon360.fr>",
    to: [d.email],
    reply_to: BOITE,
    subject: "Votre demande de partenariat Mongazon360",
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1f2d24;line-height:1.6;max-width:600px">
<p>Bonjour ${esc(d.contact)},</p>
<p>Merci pour la demande de partenariat de <strong>${esc(d.entreprise)}</strong>. Elle est bien arrivée.</p>
<p>Nous l'étudions et revenons vers vous sous 2 jours ouvrés avec nos conditions et nos tarifs.</p>
<p>Pour toute question, répondez simplement à cet email.</p>
<p>L'équipe Mongazon360<br/><a href="https://mongazon360.fr" style="color:#2e7d32">mongazon360.fr</a></p></div>`,
  };
}

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });
  const b = req.body || {};
  if (b.piege || !(Number(b.duree) >= 3000)) return res.json({ ok: true }); // robot : rien d'enregistré
  const { demande, erreur } = verifier(b);
  if (erreur) return res.status(400).json({ error: erreur });

  try {
    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    // Même entreprise renvoyée dans les 10 minutes (double clic, rechargement) : déjà reçue
    const { data: recente } = await supabase.from("partenaires_demandes").select("id")
      .eq("email", demande.email).gte("created_at", new Date(Date.now() - 10 * 60000).toISOString()).limit(1);
    if (recente?.length) return res.json({ ok: true });
    const { count } = await supabase.from("partenaires_demandes").select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 3600e3).toISOString());
    if (count >= MAX_PAR_HEURE) {
      await reportServerError("Partenaires — trop de demandes en une heure", new Error(`${count} demandes en une heure`));
      return res.status(429).json({ error: `Trop de demandes en ce moment. Réessayez plus tard ou écrivez-nous à ${BOITE}.` });
    }

    const { data: ligneEnregistree, error } = await supabase.from("partenaires_demandes").insert(demande).select("id").single();
    if (error) throw error;
    // Conservation (politique de confidentialité, 5.5) : 3 ans après la demande, sauf partenariat conclu
    await supabase.from("partenaires_demandes").delete()
      .lt("created_at", new Date(Date.now() - 3 * 365.25 * 864e5).toISOString()).neq("statut", "acceptee");

    try {
      await envoyerEmail(emailInterne(demande));
      await supabase.from("partenaires_demandes").update({ email_envoye: true }).eq("id", ligneEnregistree.id);
      await envoyerEmail(accuseReception(demande));
    } catch (e) {
      // Demande enregistrée : on prévient sans faire échouer le formulaire
      await reportServerError("Partenaires — email de demande", e, { Entreprise: demande.entreprise });
    }
    return res.json({ ok: true });
  } catch (e) {
    await reportServerError("Partenaires — demande non enregistrée", e, { Entreprise: demande.entreprise });
    return res.status(500).json({ error: `L'envoi n'a pas abouti. Réessayez dans un instant ou écrivez-nous à ${BOITE}.` });
  }
}

module.exports = { handler, verifier, SERVICES };
