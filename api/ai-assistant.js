// api/ai-assistant.js
// Assistant IA gazon — Groq/Llama 3.1 avec contexte personnalisé

const { createClerkClient } = require("@clerk/backend");
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

  // Décodage du payload Clerk (même méthode que rgpd-data.js / send.js — fonctionne
  // avec l'instance de production clerk.mongazon360.fr). On lit le sub ; l'identité
  // est revérifiée via l'API Clerk plus bas (clerk.users.getUser).
  let clerkUserId = null;
  try {
    const parts = authHeader.replace("Bearer ", "").split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      clerkUserId = payload.sub || payload.user_id;
    }
  } catch {}
  if (!clerkUserId) {
    return res.status(401).json({ error: "Token invalide" });
  }

  // ✅ RATE LIMITING — max 20 messages Bob par jour (Free + Premium)
  // Premium a accès à Bob mais avec limite raisonnable pour contrôler les coûts
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const today    = new Date().toISOString().split("T")[0];
    const rateKey  = `bob_${clerkUserId}_${today}`;

    const { data: rateData } = await supabase
      .from("rate_limits")
      .select("count")
      .eq("key", rateKey)
      .maybeSingle();

    const currentCount = rateData?.count || 0;

    // Admins illimités
    const ADMIN_EMAILS = ["mongazon360@gmail.com", "jordankrebs1@gmail.com"];
    const clerkUser    = await clerk.users.getUser(clerkUserId);
    const userEmail    = clerkUser.emailAddresses?.[0]?.emailAddress || "";
    const isAdmin      = ADMIN_EMAILS.includes(userEmail) || clerkUser.publicMetadata?.role === "admin";
    const isPremium    = clerkUser.publicMetadata?.isSubscribed === true ||
                         clerkUser.publicMetadata?.subscriptionStatus === "active";

    // Free : 5 messages/jour — Premium : 20 messages/jour
    const dailyLimit = isAdmin ? 9999 : isPremium ? 20 : 5;

    if (currentCount >= dailyLimit) {
      const msg = isPremium
        ? "Limite journalière atteinte (20 messages). Revenez demain !"
        : "Limite gratuite atteinte (5 messages). Passez Premium pour 20 messages/jour.";
      return res.status(429).json({ error: msg });
    }

    // Incrémenter
    await supabase.from("rate_limits").upsert(
      { key: rateKey, count: currentCount + 1, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  } catch (e) {
    console.warn("[MG360] bob rate_limit (non bloquant):", e.message);
  }

  try {
    const { messages, profile = {}, weather = {}, score = 0, month = 1 } = req.body;
    if (!messages?.length) throw new Error("Messages manquants");

    const MOIS = ["","Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

    const systemPrompt = `Tu es Bob, l'assistant expert en gazon et pelouses de l'application Mongazon360™.
Tu es passionné, bienveillant et très compétent en agronomie du gazon.

CONTEXTE UTILISATEUR :
- Score de santé actuel : ${score}/100
- Mois : ${MOIS[month]}
- Type de gazon : ${profile.pelouse || "non renseigné"}
- Type de sol : ${profile.sol || "non renseigné"}
- Surface : ${profile.surface ? profile.surface + " m²" : "non renseignée"}
- Objectif : ${profile.objectif || "non renseigné"}
- Ville : ${profile.ville || "non renseignée"}
${weather.temp_max ? `- Météo : ${Math.round(weather.temp_max)}°C max, ${weather.precip}mm pluie, humidité ${weather.humidity}%` : "- Météo : non disponible"}

DOCTRINE MONGAZON360 (règles officielles de l'app — à respecter IMPÉRATIVEMENT) :
- ARROSAGE : toujours recommander tôt LE MATIN (jamais le soir). L'arrosage matinal limite les maladies fongiques et l'évaporation.
- FRÉQUENCE ARROSAGE : environ 2x/semaine en conditions normales, davantage en été/forte chaleur, jamais par forte pluie (≥8mm).
- HAUTEUR DE TONTE selon le type de gazon : ombre/mi-ombre 6-8cm · rustique 7-10cm · sport 3-4cm (jamais sous 2,5cm) · standard 4-5cm.
- OBJECTIF NATUREL : si l'objectif de l'utilisateur est "naturel", ne recommander QUE des produits bio/organiques (engrais organique, soufre anti-mousse, désherbage manuel) — jamais de produits chimiques.
- BERMUDA EN HIVER (nov-mars) : la couleur brune est une dormance normale, ne recommander aucune intervention.
- RÈGLE MAÎTRESSE : tes conseils doivent toujours être COHÉRENTS avec les recommandations affichées dans l'application Mongazon360. Ne contredis jamais ce que l'app préconise.

RÈGLES :
- Réponds toujours en français
- Sois précis et pratique — donne des conseils concrets et actionnables
- Adapte tes conseils au profil et à la saison actuelle
- Réponds de manière concise (3-5 phrases max sauf si question complexe)
- Utilise des emojis avec parcimonie pour rendre la lecture agréable
- Si tu ne sais pas, dis-le honnêtement
- Ne parle QUE de gazon, pelouse, jardinage — redirige poliment hors sujet
- Slogan de l'app : "Tant qu'il y a gazon, il y a match" 🌿`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model:                 "openai/gpt-oss-20b",
        max_completion_tokens: 600,
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
    res.json({ success:true, reply });

  } catch (e) {
    console.error("ai-assistant:", e.message);
    res.status(500).json({ error: e.message });
  }
};
