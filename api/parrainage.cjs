// api/parrainage.cjs
// Parrainage et codes créateurs (tables codes + parrainages, serveur uniquement).
//   - Chaque utilisateur a un code de parrainage (créé à la demande) ; les créateurs ont un code choisi
//     dans Pilotage → Finances, avec un taux de commission sur les abonnements de leurs filleuls.
//   - Filleul : 1 mois de Premium offert à l'inscription (Premium offert, règle unique api/premium.cjs).
//   - Parrain : 1 mois offert par filleul actif (2 jours d'utilisation de l'app), 12 par an au plus ;
//     abonné → crédit Stripe d'un mois sur la prochaine facture. Récompenses versées par la tâche du matin.
// Conditions publiées dans les CGV (article « Parrainage et codes créateurs »).

const MOIS_OFFERT_JOURS = 30;
const RECOMPENSES_PAR_AN = 12;
const CREDIT_ABONNE_CENTIMES = 499;

const normCode = (c) => String(c || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
const codeValide = (c) => /^[A-Z0-9]{3,16}$/.test(c);
const lien = (code) => `https://mongazon360.fr/?p=${code}`;

const clerkClient = () => require("@clerk/backend").createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const stripeGet = async (chemin) => {
  const r = await fetch(`https://api.stripe.com/v1/${chemin}`, { headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } });
  if (!r.ok) throw new Error(`Stripe ${r.status}`);
  return r.json();
};
const clientStripe = async (userId) =>
  (await stripeGet(`subscriptions/search?query=${encodeURIComponent(`metadata['userId']:'${userId}'`)}&limit=1`)).data?.[0]?.customer || null;

// Ajoute des jours de Premium offert (user_access + Clerk), à partir d'aujourd'hui ou de la fin actuelle.
// Un accès offert à vie n'est pas modifié. Renvoie la nouvelle date de fin, ou null si rien n'a changé.
async function offrirJours(sb, userId, jours, libelle) {
  const { todayParis } = require("./premium.cjs");
  const { data: row } = await sb.from("user_access").select("status, guest_until").eq("user_id", userId).maybeSingle();
  if (row?.status === "guest" && !row.guest_until) return null;
  const base = row?.status === "guest" && row.guest_until > todayParis() ? new Date(row.guest_until) : new Date(todayParis());
  base.setDate(base.getDate() + jours);
  const until = base.toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const { error } = await sb.from("user_access").upsert(
    { user_id: userId, status: "guest", guest_until: until, guest_label: libelle, updated_at: now, ...(row ? {} : { approved_at: now }) },
    { onConflict: "user_id" });
  if (error) throw error;
  await clerkClient().users.updateUserMetadata(userId, { publicMetadata: { guestAccess: true, guestUntil: until } });
  return until;
}

// Code de parrainage de l'utilisateur (créé au premier appel : prénom + 3 caractères) et ses résultats
async function monCode(sb, userId) {
  let { data: c } = await sb.from("codes").select("code").eq("user_id", userId).maybeSingle();
  if (!c) {
    const u = await clerkClient().users.getUser(userId);
    const prefixe = (u.firstName || "AMI").normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 8) || "AMI";
    for (let i = 0; i < 5 && !c; i++) {
      const code = prefixe + Math.random().toString(36).slice(2, 5).toUpperCase();
      const { error } = await sb.from("codes").insert({ code, type: "parrain", user_id: userId });
      if (!error) c = { code };
      else if (error.code !== "23505") throw error;
    }
    if (!c) throw new Error("Code de parrainage impossible à créer");
  }
  const [{ data: filleuls }, { data: utilise }] = await Promise.all([
    sb.from("parrainages").select("recompense_at").eq("code", c.code),
    sb.from("parrainages").select("code").eq("filleul_id", userId).maybeSingle(),
  ]);
  return {
    codeUtilise: utilise?.code || null,
    code: c.code, lien: lien(c.code),
    filleuls: (filleuls || []).length,
    recompenses: (filleuls || []).filter(f => f.recompense_at).length,
  };
}

// Code saisi ou reçu par lien à l'inscription : 1 mois offert au filleul. Erreurs lisibles par l'utilisateur.
async function utiliserCode(sb, userId, brut) {
  const code = normCode(brut);
  if (!codeValide(code)) throw new Error("Code invalide");
  const { data: c } = await sb.from("codes").select("code, type, user_id, actif").eq("code", code).maybeSingle();
  if (!c || !c.actif) throw new Error("Ce code n'existe pas ou n'est plus actif");
  if (c.user_id === userId) throw new Error("Tu ne peux pas utiliser ton propre code");
  const u = await clerkClient().users.getUser(userId);
  if (Date.now() - u.createdAt > 7 * 86400000) throw new Error("Le code se saisit dans les 7 jours qui suivent l'inscription");
  const { data: deja } = await sb.from("parrainages").select("code").eq("filleul_id", userId).maybeSingle();
  if (deja) throw new Error("Un code a déjà été utilisé sur ce compte");
  const { error } = await sb.from("parrainages").insert({ filleul_id: userId, code });
  if (error) throw error;
  const subscribed = u.publicMetadata?.isSubscribed === true;
  const until = subscribed ? null : await offrirJours(sb, userId, MOIS_OFFERT_JOURS, `${c.type === "createur" ? "Code créateur" : "Parrainage"} ${code}`);
  return { code, type: c.type, until };
}

// Email au parrain récompensé (transactionnel) ; un échec d'envoi ne remet pas en cause la récompense
async function prevenirParrain(u, message) {
  const email = u.primaryEmailAddress?.emailAddress || u.emailAddresses?.[0]?.emailAddress;
  if (!email) return;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "Bob de Mongazon360 <bonjour@mongazon360.fr>", to: [email],
        subject: "🎁 Ton parrainage t'a fait gagner 1 mois",
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1b3a24">
          <h2 style="color:#2e7d32">Merci ${u.firstName || ""} !</h2>
          <p>Un ami que tu as parrainé utilise maintenant Mongazon360 : ${message}</p>
          <p>Continue de partager ton lien depuis Mon Gazon → « Parraine tes amis » (12 mois offerts par an au plus).</p>
          <p><a href="https://mongazon360.fr/my-lawn" style="background:#2e7d32;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Ouvrir Mongazon360</a></p></div>`,
      }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}`);
  } catch (e) {
    await require("./alerting.cjs").reportServerError("Parrainage — email au parrain non envoyé", e, { "Parrain": u.id });
  }
}

// Tâche du matin : récompense des parrains dont le filleul a utilisé l'app au moins 2 jours différents
async function recompenserParrains(sb) {
  const { data: enAttente } = await sb.from("parrainages").select("filleul_id, code, codes!inner(type, user_id)")
    .is("recompense_at", null).eq("codes.type", "parrain");
  let n = 0;
  for (const p of enAttente || []) {
    try {
      const { count } = await sb.from("daily_active_users").select("day", { count: "exact", head: true }).eq("user_id", p.filleul_id);
      if ((count || 0) < 2) continue;
      const parrain = p.codes.user_id;
      const an = new Date(Date.now() - 365 * 86400000).toISOString();
      const { data: codesParrain } = await sb.from("codes").select("code").eq("user_id", parrain);
      const { count: dejaRecompense } = await sb.from("parrainages").select("filleul_id", { count: "exact", head: true })
        .in("code", (codesParrain || []).map(c => c.code)).gte("recompense_at", an);
      let recompense = "plafond annuel atteint", message = null;
      const u = await clerkClient().users.getUser(parrain);
      if ((dejaRecompense || 0) < RECOMPENSES_PAR_AN) {
        if (u.publicMetadata?.isSubscribed === true) {
          const client = await clientStripe(parrain);
          if (!client) throw new Error("Client Stripe introuvable pour ce parrain abonné");
          const r = await fetch(`https://api.stripe.com/v1/customers/${client}/balance_transactions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ amount: String(-CREDIT_ABONNE_CENTIMES), currency: "eur", description: "Parrainage Mongazon360 : 1 mois offert" }),
          });
          if (!r.ok) throw new Error(`Stripe : crédit de parrainage refusé (HTTP ${r.status})`);
          recompense = "crédit Stripe 1 mois";
          message = "un crédit de 4,99 € est déduit de ta prochaine facture Premium.";
        } else {
          const until = await offrirJours(sb, parrain, MOIS_OFFERT_JOURS, `Parrainage ${p.code}`);
          recompense = until ? `Premium offert jusqu'au ${until}` : "Premium déjà offert à vie";
          if (until) message = `ton Premium est offert jusqu'au ${new Date(until).toLocaleDateString("fr-FR")}.`;
        }
      }
      await sb.from("parrainages").update({ recompense_at: new Date().toISOString(), recompense }).eq("filleul_id", p.filleul_id);
      if (message) await prevenirParrain(u, message);
      n++;
    } catch (e) {
      // Un parrain en erreur n'empêche pas les autres ; il sera retenté le lendemain
      await require("./alerting.cjs").reportServerError("Parrainage — récompense non versée", e, { "Filleul": p.filleul_id, "Code": p.code });
    }
  }
  return n;
}

// Pilotage → Finances : codes créateurs et parrainage, avec inscrits, actifs, abonnés, CA et commission
async function statsCodes(sb, clerkUsers) {
  const [{ data: codes }, { data: filleuls }, { data: actifs }] = await Promise.all([
    sb.from("codes").select("*").order("created_at", { ascending: false }),
    sb.from("parrainages").select("filleul_id, code, created_at, recompense_at"),
    sb.from("daily_active_users").select("user_id, day"),
  ]);
  const jours = {};
  for (const a of actifs || []) (jours[a.user_id] ||= new Set()).add(a.day);
  const abonnes = new Set(clerkUsers.filter(u => u.public_metadata?.isSubscribed === true).map(u => u.id));
  const parCode = {};
  for (const f of filleuls || []) (parCode[f.code] ||= []).push(f);

  const createurs = [];
  for (const c of (codes || []).filter(c => c.type === "createur")) {
    const liste = parCode[c.code] || [];
    let ca = 0;
    for (const f of liste.filter(f => abonnes.has(f.filleul_id))) {
      try {
        const client = await clientStripe(f.filleul_id);
        if (!client) continue;
        const fin = new Date(f.created_at); fin.setMonth(fin.getMonth() + c.duree_mois);
        const factures = await stripeGet(`invoices?customer=${client}&status=paid&limit=100`);
        ca += (factures.data || []).filter(i => i.created * 1000 <= fin.getTime()).reduce((s, i) => s + (i.amount_paid || 0), 0);
      } catch (e) { console.warn("[parrainage] CA créateur :", e.message); }
    }
    createurs.push({
      code: c.code, nom: c.nom, email: c.email, actif: c.actif, commissionPct: c.commission_pct, dureeMois: c.duree_mois,
      lien: lien(c.code), inscrits: liste.length,
      actifs: liste.filter(f => (jours[f.filleul_id]?.size || 0) >= 2).length,
      abonnes: liste.filter(f => abonnes.has(f.filleul_id)).length,
      ca: ca / 100, commission: Math.round(ca * (c.commission_pct || 0)) / 10000,
    });
  }
  const parrainages = (filleuls || []).filter(f => (codes || []).find(c => c.code === f.code)?.type === "parrain");
  return {
    createurs,
    parrainage: {
      parrains: new Set(parrainages.map(f => f.code)).size,
      filleuls: parrainages.length,
      recompenses: parrainages.filter(f => f.recompense_at).length,
    },
  };
}

// Pilotage → Finances : ajout ou modification d'un code créateur
async function enregistrerCreateur(sb, { code, nom, email, commissionPct, dureeMois, actif }) {
  const c = normCode(code);
  if (!codeValide(c)) throw new Error("Code : 3 à 16 lettres ou chiffres");
  const pct = Number(commissionPct);
  if (!(pct >= 0 && pct <= 100)) throw new Error("Commission entre 0 et 100 %");
  const { data: existant } = await sb.from("codes").select("type").eq("code", c).maybeSingle();
  if (existant && existant.type !== "createur") throw new Error("Ce code est déjà pris par un parrain");
  const { error } = await sb.from("codes").upsert({
    code: c, type: "createur", nom: String(nom || "").slice(0, 80) || null, email: String(email || "").slice(0, 120) || null,
    commission_pct: pct, duree_mois: Number(dureeMois) > 0 ? Number(dureeMois) : 12, actif: actif !== false,
  }, { onConflict: "code" });
  if (error) throw error;
}

module.exports = { normCode, monCode, utiliserCode, recompenserParrains, statsCodes, enregistrerCreateur };
