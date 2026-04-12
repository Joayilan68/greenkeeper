// api/ai-recommendations.js
// ─────────────────────────────────────────────────────────────────────────────
// Route IA Groq avec rate limiting Supabase
// Limites : Free = 20 req/jour · Premium = 50 req/jour · Admin = illimité
// ─────────────────────────────────────────────────────────────────────────────

const { createClient } = require("@supabase/supabase-js");
const { createClerkClient } = require("@clerk/backend");

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // clé service_role (pas anon) pour contourner RLS
);

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// ── Limites par tier ──────────────────────────────────────────────────────────
const LIMITS = {
  admin:   Infinity,
  paid:    50,
  free:    20,
  unknown: 5,
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
        const token   = authHeader.replace("Bearer ", "");
        const payload = await clerk.verifyToken(token);
        userId = payload.sub;

        // Récupérer les métadonnées pour déterminer le tier
        const user = await clerk.users.getUser(userId);
        const meta = user.publicMetadata || {};

        if (meta.role === "admin") {
          tier = "admin";
        } else {
          // Vérifier le statut subscription via l'API interne
          const subRes = await fetch(
            `${process.env.VITE_APP_URL}/api/subscription-status`,
            { headers: { Authorization: authHeader } }
          );
          if (subRes.ok) {
            const subData = await subRes.json();
            tier = subData.isSubscribed ? "paid" : "free";
          } else {
            tier = "free";
          }
        }
      } catch {
        // Token invalide → on traite comme inconnu
        userId = req.headers["x-forwarded-for"]?.split(",")[0] || "anonymous";
        tier   = "unknown";
      }
    } else {
      // Pas de token → fallback sur IP
      userId = req.headers["x-forwarded-for"]?.split(",")[0] || "anonymous";
      tier   = "unknown";
    }

    // ── 2. Rate limiting ─────────────────────────────────────────────────────
    const { allowed, count, limit } = await checkRateLimit(userId, tier);

    // Headers informatifs (utiles pour le debug)
    res.setHeader("X-RateLimit-Limit",     limit === Infinity ? "unlimited" : limit);
    res.setHeader("X-RateLimit-Remaining", limit === Infinity ? "unlimited" : Math.max(0, limit - count));

    if (!allowed) {
      return res.status(429).json({
        error:   "Limite quotidienne atteinte",
        message: tier === "free"
          ? `Vous avez atteint la limite de ${limit} recommandations IA par jour. Passez Premium pour en obtenir ${LIMITS.paid}.`
          : `Limite de ${limit} recommandations IA/jour atteinte. Réessayez demain.`,
        limit,
        count,
        tier,
      });
    }

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
          model:       "llama-3.1-8b-instant",
          max_tokens:  800,
          temperature: 0.7,
          messages:    [{ role: "user", content: prompt }],
        }),
      }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("Réponse vide de Groq");

    res.json({ text, meta: { count, limit: limit === Infinity ? "unlimited" : limit } });

  } catch (e) {
    console.error("AI Error:", e.message);
    res.status(500).json({ error: e.message });
  }
};
