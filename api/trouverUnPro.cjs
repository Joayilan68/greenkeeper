// api/trouverUnPro.cjs — liste d'attente de « Trouver un pro » (go de Jordan du 31/10/2026, CLAUDE.md « Paysagistes
// partenaires ») : encart « Besoin d'un pro ? » des articles Conseils et du résultat du diagnostic → table pros_attente
// (serveur uniquement, une ligne par email) et email de confirmation ; la personne est prévenue à l'ouverture
// (src/lib/trouverUnPro.json). Ses coordonnées ne sont jamais transmises à un pro : à l'ouverture, elle fait sa demande.
// POST /api/send?type=pro-attente   corps : { email, code_postal, travaux[], source, page, campagne, piege, duree }
// Authorization: Bearer <jeton Clerk> facultatif (compte rattaché). Anti-robots sans compte : « piege » (champ caché) rempli
// ou envoi moins de 2 s après l'ouverture du formulaire (« duree », ms) → « ok » sans rien enregistrer ; 50 inscriptions
// par heure au plus.
const { reportServerError } = require("./alerting.cjs");
const { envoyerEmail, SERVICES } = require("./partenaires.cjs");
const { ouverture } = require("../src/lib/trouverUnPro.json");

const MAX_PAR_HEURE = 50;
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const texte = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// Contrôle des champs : renvoie { inscription } ou { erreur } (message lisible par la personne)
function verifier(b) {
  const d = {
    email: texte(b.email, 120).toLowerCase(),
    code_postal: texte(b.code_postal, 5),
    travaux: [...new Set(Array.isArray(b.travaux) ? b.travaux.filter(t => SERVICES[t]) : [])],
    source: texte(b.source, 40) || null,
    page: texte(b.page, 80) || null,
    campagne: texte(b.campagne, 80) || null,
  };
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(d.email)) return { erreur: "L'adresse email semble incorrecte." };
  if (!/^\d{5}$/.test(d.code_postal)) return { erreur: "Le code postal doit compter 5 chiffres." };
  if (!d.travaux.length) return { erreur: "Cochez au moins un type de travaux." };
  return { inscription: d };
}

function confirmation(d) {
  return {
    from: "Mongazon360 <bonjour@mongazon360.fr>",
    to: [d.email],
    reply_to: "contact@mongazon360.fr",
    subject: "C'est noté : on vous prévient à l'ouverture de « Trouver un pro »",
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1f2d24;line-height:1.6;max-width:600px">
<p>Bonjour,</p>
<p>C'est noté : on vous préviendra dès l'ouverture de <strong>« Trouver un pro »</strong> dans Mongazon360, ${ouverture}, pour vos travaux
(${d.travaux.map(t => esc(SERVICES[t])).join(" ; ")}) près de chez vous (${esc(d.code_postal)}).</p>
<p>Vous pourrez alors demander un paysagiste ou un jardinier de votre secteur, directement dans l'app. Vos coordonnées ne sont jamais
transmises à un professionnel sans votre demande.</p>
<p>Vous ne voulez plus être prévenu ? Répondez simplement à cet email.</p>
<p>L'équipe Mongazon360<br/><a href="https://mongazon360.fr" style="color:#2e7d32">mongazon360.fr</a></p></div>`,
  };
}

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });
  const b = req.body || {};
  let userId = null;
  if (req.headers.authorization?.startsWith("Bearer ")) {
    try { userId = await require("./auth.cjs").verifiedUserId(req); } catch { /* jeton refusé : inscription sans compte */ }
  }
  if (b.piege || (!userId && !(Number(b.duree) >= 2000))) return res.json({ ok: true }); // robot : rien d'enregistré
  const { inscription, erreur } = verifier(b);
  if (erreur) return res.status(400).json({ error: erreur });

  try {
    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    // Déjà inscrit : travaux ajoutés et code postal mis à jour, sans nouvel email
    const { data: deja } = await supabase.from("pros_attente").select("id, travaux").eq("email", inscription.email).maybeSingle();
    if (deja) {
      await supabase.from("pros_attente").update({ code_postal: inscription.code_postal, updated_at: new Date().toISOString(),
        travaux: [...new Set([...deja.travaux, ...inscription.travaux])], ...(userId ? { user_id: userId } : {}) }).eq("id", deja.id);
      return res.json({ ok: true });
    }
    const { count } = await supabase.from("pros_attente").select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 3600e3).toISOString());
    if (count >= MAX_PAR_HEURE) {
      await reportServerError("Trouver un pro — trop d'inscriptions en une heure", new Error(`${count} inscriptions en une heure`));
      return res.status(429).json({ error: "Trop d'inscriptions en ce moment. Réessayez plus tard." });
    }
    const { data: ligne, error } = await supabase.from("pros_attente").insert({ ...inscription, user_id: userId }).select("id").single();
    if (error?.code === "23505") return res.json({ ok: true }); // même email envoyé deux fois en même temps
    if (error) throw error;
    // Conservation (politique de confidentialité, 5.6) : 12 mois au plus
    await supabase.from("pros_attente").delete().lt("created_at", new Date(Date.now() - 365.25 * 864e5).toISOString());

    try {
      await envoyerEmail(confirmation(inscription));
      await supabase.from("pros_attente").update({ email_envoye: true }).eq("id", ligne.id);
    } catch (e) {
      // Inscription enregistrée : on prévient sans faire échouer le formulaire
      await reportServerError("Trouver un pro — email de confirmation", e, { "Code postal": inscription.code_postal });
    }
    return res.json({ ok: true });
  } catch (e) {
    await reportServerError("Trouver un pro — inscription non enregistrée", e, { "Code postal": inscription.code_postal });
    return res.status(500).json({ error: "L'inscription n'a pas abouti. Réessayez dans un instant." });
  }
}

module.exports = { handler, verifier };
