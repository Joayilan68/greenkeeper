// api/ai-recommendations.js
// ─────────────────────────────────────────────────────────────────────────────
// Route IA Groq avec rate limiting Supabase
// Limites : Free = 0 · Premium = 10/jour (reset minuit UTC) · Admin = illimité · Unknown = 2/jour par IP
// ─────────────────────────────────────────────────────────────────────────────

const { createClient } = require("@supabase/supabase-js");
const { createClerkClient } = require("@clerk/backend");

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// ── DOCTRINE MONGAZON360 ──────────────────────────────────────────────────────
// Règles officielles de l'app, injectées en message system pour que les
// recommandations IA restent cohérentes avec ce que l'app préconise.
// (Identique à la doctrine du chat Bob — ai-assistant.js.)
const DOCTRINE_MG360 = `Tu es l'assistant agronomique de l'application Mongazon360™.

PRINCIPE DE BASE : couvre l'ensemble des types d'entretien pertinents selon la saison, la météo et le profil (tonte, fertilisation, désherbage, aération, arrosage, traitements...). Ne privilégie AUCUN type d'entretien en particulier : l'arrosage n'est qu'un sujet parmi d'autres et ne doit pas dominer tes recommandations. Choisis les sujets les plus utiles au moment présent.

CONTRAINTES DE COHÉRENCE (à respecter UNIQUEMENT quand le sujet concerné est abordé — ce ne sont PAS des sujets à mettre en avant) :
- SI tu mentionnes l'arrosage : recommande-le tôt le matin (jamais le soir), ~2x/semaine en conditions normales, plus en forte chaleur, jamais par forte pluie (≥8mm).
- SI tu mentionnes la tonte : respecte les hauteurs par type de gazon — ombre/mi-ombre 6-8cm, rustique 7-10cm, sport 3-4cm (jamais sous 2,5cm), standard 4-5cm.
- SI l'objectif de l'utilisateur est "naturel" : ne recommande que des produits bio/organiques, jamais de chimique.
- SI le gazon est de type Bermuda en hiver (nov-mars) : la couleur brune est une dormance normale, ne recommande aucune intervention.

RÈGLE MAÎTRESSE : tes recommandations doivent toujours être cohérentes avec ce que l'application Mongazon360 préconise. Ne contredis jamais l'app.
Réponds toujours en français.`;

// ── Limites par tier ──────────────────────────────────────────────────────────
const LIMITS = {
  admin:   Infinity, // illimité — Jordan uniquement
  paid:    10,       // 10/jour — largement suffisant pour usage normal
  free:    1,        // 1/jour — recommandation automatique du jour uniquement
  unknown: 0,        // 0 — appels sans token bloqués
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Retourne le début de la journée UTC courante (pour la fenêtre 24h)
 */
function todayUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Vérifie et incrémente le compteur de rate limiting.
 * Retourne { allowed: bool, count: number, limit: number }
 */
async function checkRateLimit(userId, tier) {
  const limit    = LIMITS[tier] ?? LIMITS.unknown;
  const endpoint = "ai-recommendations";
  const window   = todayUTC();

  if (limit === Infinity) return { allowed: true, count: 0, limit };

  // Cherche un enregistrement existant pour aujourd'hui
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("id, count")
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .gte("window_start", window)
    .single();

  if (!existing) {
    // Première requête aujourd'hui → créer l'enregistrement
    await supabase.from("rate_limits").insert({
      user_id:      userId,
      endpoint,
      count:        1,
      window_start: window,
    });
    return { allowed: true, count: 1, limit };
  }

  if (existing.count >= limit) {
    return { allowed: false, count: existing.count, limit };
  }

  // Incrémenter
  await supabase
    .from("rate_limits")
    .update({ count: existing.count + 1 })
    .eq("id", existing.id);

  return { allowed: true, count: existing.count + 1, limit };
}

// ── Handler principal ─────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt manquant" });

    // ── 1. Identification utilisateur ────────────────────────────────────────
    let userId = null;
    let tier   = "unknown";

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        // Décoder le JWT manuellement pour extraire le sub (user_id)
        // puis vérifier via Clerk Admin API que l'user existe bien
        const token = authHeader.replace("Bearer ", "");
        const parts = token.split(".");
        if (parts.length !== 3) throw new Error("JWT malformé");
        const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
        const payload     = JSON.parse(payloadJson);
        userId = payload.sub || payload.user_id;
        if (!userId) throw new Error("sub manquant");

        // Vérifier que l'user existe dans Clerk (prouve que le token est légitime)
        const user = await clerk.users.getUser(userId);
        const ADMIN_EMAILS = ["mongazon360@gmail.com", "jordankrebs1@gmail.com"];
        const email = user.emailAddresses?.[0]?.emailAddress || "";

        const isAdmin   = user.publicMetadata?.role === "admin" || ADMIN_EMAILS.includes(email);
        const isPremium = user.publicMetadata?.isSubscribed === true ||
                          user.publicMetadata?.subscriptionStatus === "active";

        if (isAdmin) {
          tier = "admin";
        } else if (isPremium) {
          tier = "paid";
        } else {
          // Premium invité — vérité serveur : user_access.status === "guest"
          let isGuest = false;
          try {
            const { data: ua } = await supabase
              .from("user_access")
              .select("status")
              .eq("user_id", userId)
              .maybeSingle();
            isGuest = ua?.status === "guest";
          } catch (e) {
            console.warn("[MG360] guest check (ai-reco) :", e.message);
          }
          tier = isGuest ? "paid" : "free";
        }
      } catch {
        // Token invalide ou user inexistant
        userId = req.headers["x-forwarded-for"]?.split(",")[0] || "anonymous";
        tier   = "unknown";
      }
    } else {
      userId = req.headers["x-forwarded-for"]?.split(",")[0] || "anonymous";
      tier   = "unknown";
    }

    // ── 2. Rate limiting ─────────────────────────────────────────────────────
    // Bloquer les appels sans token valide (unknown = IP) ET les comptes gratuits.
    // Accès réservé : admin, Premium Stripe, invité (user_access.status="guest").
    if (tier === "unknown") {
      return res.status(401).json({
        error:   "Authentification requise",
        message: "Connectez-vous pour accéder aux recommandations IA.",
      });
    }
    if (tier === "free") {
      return res.status(403).json({
        error:   "Fonctionnalité réservée aux membres Premium",
        message: "Passez Premium pour débloquer les recommandations IA.",
      });
    }
    // Admin et Premium : pas de rate limiting — cache localStorage côté client
    // gère la fréquence (1 appel/jour max via AI_RECO_KEY)

    // ── 3. Appel Groq ────────────────────────────────────────────────────────
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model:                 "openai/gpt-oss-20b",
          max_completion_tokens: 800,
          temperature:           0.7,
          // gpt-oss est un modèle de raisonnement : on désactive le raisonnement
          // visible pour ne récupérer que le texte de recommandation final.
          reasoning_effort:  "low",
          include_reasoning: false,
          messages: [
            { role: "system", content: DOCTRINE_MG360 },
            { role: "user",   content: prompt },
          ],
        }),
      }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("Réponse vide de Groq");

    res.json({ text });

  } catch (e) {
    console.error("AI Error:", e.message);
    res.status(500).json({ error: e.message });
  }
};
