// api/ai-assistant.js
// Assistant IA gazon « Bob » — Groq (modèle : aiModels.cjs) avec contexte personnalisé

const { createClerkClient } = require("@clerk/backend");
const { verifiedUserId, ADMIN_EMAILS } = require("./auth.cjs");
const { isGuestUser } = require("./premium.cjs");
const { buildBobContext } = require("./bobContext.cjs");
const { createClient }      = require("@supabase/supabase-js");

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  // ✅ AUTH — token Clerk obligatoire
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant" });
  }

  const clerkUserId = await verifiedUserId(req);
  if (!clerkUserId) {
    return res.status(401).json({ error: "Token invalide" });
  }

  // ✅ QUOTA — compté en base (fonction bob_consume : verrou par compte, périodes à l'heure de Paris)
  //   Premium / essai / Premium offert : 20 questions par jour · Gratuit : 3 par mois · Admin : illimité
  const QUOTAS = {
    paid: { endpoint: "bob",      period: "day",   limit: 20 },
    free: { endpoint: "bob_free", period: "month", limit: 3 },
  };
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
  let quota, consumed = null, premium = false;
  try {
    const clerkUser  = await clerk.users.getUser(clerkUserId);
    const userEmail  = clerkUser.emailAddresses?.[0]?.emailAddress || "";
    const isAdmin    = ADMIN_EMAILS.includes(userEmail) || clerkUser.publicMetadata?.role === "admin";
    // Essai gratuit 7 jours (unsafeMetadata.trialStartedAt, posé côté client)
    const TRIAL_MS   = 7 * 24 * 60 * 60 * 1000;
    const trialMeta  = clerkUser.unsafeMetadata || clerkUser.unsafe_metadata || {};
    const trialStart = Number(trialMeta.trialStartedAt) || 0;
    const isTrial    = trialStart > 0 && Date.now() < trialStart + TRIAL_MS;
    const isPremium  = clerkUser.publicMetadata?.isSubscribed === true ||
                       clerkUser.publicMetadata?.subscriptionStatus === "active" ||
                       clerkUser.publicMetadata?.subscriptionStatus === "trialing" ||
                       isTrial || await isGuestUser(clerkUserId, clerkUser.publicMetadata);
    premium = isAdmin || isPremium;
    quota = isAdmin ? null : isPremium ? QUOTAS.paid : QUOTAS.free;

    // Consultation du solde (affichage dans l'app), sans consommer
    if (req.body?.action === "quota") {
      if (!quota) return res.json({ unlimited: true });
      const { data: used, error } = await supabase.rpc("bob_usage",
        { p_user: clerkUserId, p_endpoint: quota.endpoint, p_period: quota.period });
      if (error) throw new Error(error.message);
      return res.json({ remaining: Math.max(0, quota.limit - used), limit: quota.limit, period: quota.period });
    }

    if (quota) {
      const { data, error } = await supabase.rpc("bob_consume",
        { p_user: clerkUserId, p_endpoint: quota.endpoint, p_period: quota.period, p_limit: quota.limit });
      if (error) throw new Error(error.message);
      if (!data?.[0]?.allowed) {
        return res.status(429).json({
          remaining: 0, limit: quota.limit, period: quota.period,
          error: quota.period === "day"
            ? `Tu as posé tes ${quota.limit} questions du jour. Bob te retrouve demain ! 🌿`
            : `Tu as utilisé tes ${quota.limit} questions gratuites du mois. Avec Premium, Bob répond à ${QUOTAS.paid.limit} questions par jour.`,
        });
      }
      consumed = data[0];
    }
  } catch (e) {
    // Quota invérifiable → on refuse plutôt que de laisser passer sans limite
    await require("./alerting.cjs").reportServerError("Assistant IA Bob — quota indisponible", e);
    return res.status(503).json({ error: "Bob est momentanément indisponible. Réessaie dans quelques minutes." });
  }

  try {
    const { profile = {}, score = 0, month = 1 } = req.body;
    // Seuls les derniers échanges sont transmis (coût et pertinence maîtrisés)
    const messages = (req.body.messages || []).slice(-10)
      .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
    if (!messages.length) throw new Error("Messages manquants");

    // Dossier de l'utilisateur construit côté serveur (profil, actions, diagnostic, parcours, météo 5 jours)
    let contexte;
    try {
      contexte = await buildBobContext(supabase, { userId: clerkUserId, premium, clientProfile: profile, score, month });
    } catch (e) {
      console.warn("[bob] contexte partiel :", e.message);
      contexte = `- Score de santé : ${score}/100 · profil : ${JSON.stringify(profile).slice(0, 400)}`;
    }

    const systemPrompt = `Tu es Bob, l'assistant expert en gazon et pelouses de l'application Mongazon360®.
Tu es passionné, bienveillant et très compétent en agronomie du gazon et en jardinage.

CE QUE L'APP SAIT DE L'UTILISATEUR (utilise-le pour personnaliser, sans le réciter) :
${contexte}

PRINCIPES DE BOB :
1. Expert nuancé, pas dogmatique : donne la meilleure pratique ET explique pourquoi. Accepte les alternatives
   réalistes quand l'utilisateur a une contrainte (ex. : l'idéal est d'arroser tôt le matin ; si ce n'est possible
   que le soir, arroser en début de soirée pour que l'herbe sèche avant la nuit).
2. Des repères, pas des chiffres gravés dans le marbre : hauteurs de tonte, doses, fréquences d'arrosage sont des
   fourchettes à adapter à la saison, au sol, à l'ombre, à l'usage et à la météo. Repères courants : tonte 4 à 6 cm
   en saison (plus haut à l'ombre et en été, jamais plus d'un tiers de la hauteur par tonte) ; arrosage 1 à 2 fois
   par semaine en profondeur (10 à 15 mm) plutôt qu'un peu chaque jour.
3. Objectif « naturel » respecté sans dogme : si l'objectif de l'utilisateur est naturel, privilégie les solutions
   naturelles et organiques ; présente les autres options seulement s'il les demande, en expliquant les différences.
   Rappel : les pesticides de synthèse sont interdits aux particuliers en France depuis 2019 (loi Labbé).
4. Tout le jardin, avec le gazon en priorité : tu peux répondre sur ce qui entoure la pelouse (haies, arbres,
   massifs, potager voisin, robot tondeuse, arrosage automatique, nuisibles, outils, météo). Refuse poliment
   uniquement ce qui n'a aucun rapport avec le jardin.
5. Longueur adaptée à la question : court pour une question simple ; étapes numérotées pour un « comment faire ».
6. Appuie-toi sur ce que l'app sait (profil, météo, score ci-dessus) et reste cohérent avec l'app Mongazon360
   (plan d'entretien, alertes, diagnostic photo par Bob, parcours semis/regarnissage guidés). Si la situation
   réelle de l'utilisateur diffère de ce que l'app suppose, dis-le et explique.
7. Honnête et prudent : dis quand tu ne sais pas ou quand une photo aiderait (propose le diagnostic photo de
   l'app) ; oriente vers un professionnel si nécessaire ; rappelle de respecter l'étiquette des produits.

STYLE :
- Réponds toujours en français, en TUTOYANT l'utilisateur, avec un ton chaleureux et direct.
- Des conseils concrets et actionnables, adaptés au profil et à la saison.
- Emojis avec parcimonie.
- Slogan de l'app : "Tant qu'il y a gazon, il y a match" 🌿`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model:                 require("./aiModels.cjs").TEXT_MODEL,
        max_completion_tokens: 900,
        temperature:           0.7,
        // gpt-oss est un modèle de raisonnement : sans ces réglages, il peut
        // renvoyer son raisonnement interne dans la réponse. On le désactive
        // pour que Bob ne renvoie QUE sa réponse finale.
        reasoning_effort:  "low",   // raisonnement minimal (réponses simples + rapides)
        include_reasoning: false,   // ne pas inclure le raisonnement dans la réponse
        messages: [
          { role:"system", content: systemPrompt },
          ...messages
        ]
      })
    });

    const data = await groqRes.json();
    if (data.error) throw new Error("Groq: " + (data.error.message || JSON.stringify(data.error)));

    const reply = data.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu générer une réponse.";
    res.json({ success:true, reply, ...(consumed ? { remaining: consumed.remaining, limit: quota.limit, period: quota.period } : {}) });

  } catch (e) {
    // Réponse non fournie → la question est rendue
    if (consumed?.row_id) await supabase.from("rate_limits").delete().eq("id", consumed.row_id);
    await require("./alerting.cjs").reportServerError("Assistant IA Bob en échec", e);
    res.status(500).json({ error: e.message });
  }
};
