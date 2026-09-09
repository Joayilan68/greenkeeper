// api/analyze-lawn.js
// Upload image sur Cloudinary puis analyse avec Groq Llama Vision
// Gère aussi la purge des anciennes photos (?action=purge)

const crypto = require("crypto");
const { createClerkClient } = require("@clerk/backend");

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  // ── Route purge : POST avec { action: "purge" } ────────────────────────────
  if (req.body?.action === "purge") {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token manquant" });
    }
    try {
      const token = authHeader.replace("Bearer ", "");
      const parts = token.split(".");
      if (parts.length !== 3) throw new Error("JWT malformé");
      const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
      const payload     = JSON.parse(payloadJson);
      const uid         = payload.sub || payload.user_id;
      if (!uid) throw new Error("sub manquant");
      await clerk.users.getUser(uid); // vérifie que l'user existe
    } catch {
      return res.status(401).json({ error: "Token invalide" });
    }

    try {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey    = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
      const authB64   = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);

      const listRes  = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?prefix=mg360-diagnostics&max_results=500`,
        { headers: { Authorization: `Basic ${authB64}` } }
      );
      const listData = await listRes.json();
      const toDelete = (listData.resources || [])
        .filter(r => new Date(r.created_at) < cutoff)
        .map(r => r.public_id);

      if (!toDelete.length) {
        return res.json({ deleted: 0, message: "Aucune photo à supprimer (toutes < 90 jours)" });
      }

      const delRes  = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json", Authorization: `Basic ${authB64}` },
          body: JSON.stringify({ public_ids: toDelete }),
        }
      );
      const delData = await delRes.json();
      return res.json({
        deleted: toDelete.length,
        message: `${toDelete.length} photo(s) supprimée(s) avec succès`,
        detail:  delData,
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── Diagnostic ANONYME (sans compte) — parcours « valeur d'abord » ──────────
  // Un visiteur non connecté fait UN diagnostic gratuit, voit son score + un
  // aperçu, puis s'inscrit pour débloquer l'analyse complète. Pas de JWT requis,
  // mais plafonné (1/appareil, 2/jour/IP). Voir bas de fichier.
  if (req.body?.anon === true) return handleAnonymousDiagnostic(req, res);

  // ── Rattachement d'un diagnostic anonyme au compte fraîchement créé ─────────
  if (req.body?.action === "claim-anon") return handleClaimAnon(req, res);

  // ── Route principale : diagnostic photo ────────────────────────────────────

  // ✅ AUTH + PREMIUM CHECK — obligatoire avant tout appel Groq/Cloudinary
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant — authentification requise" });
  }

  let clerkUserId;
  let clerkUser;
  try {
    const token = authHeader.replace("Bearer ", "");
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("JWT malformé");
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload     = JSON.parse(payloadJson);
    clerkUserId = payload.sub || payload.user_id;
    if (!clerkUserId) throw new Error("sub manquant");
    clerkUser = await clerk.users.getUser(clerkUserId);
  } catch {
    return res.status(401).json({ error: "Token invalide" });
  }

  // Vérification Premium (isSubscribed) ou Admin
  const ADMIN_EMAILS = ["mongazon360@gmail.com", "jordankrebs1@gmail.com"];
  const userEmail    = clerkUser.emailAddresses?.[0]?.emailAddress || "";
  const isAdmin      = ADMIN_EMAILS.includes(userEmail) || clerkUser.publicMetadata?.role === "admin";
  const isPremium    = clerkUser.publicMetadata?.isSubscribed === true ||
                       clerkUser.publicMetadata?.subscriptionStatus === "active" ||
                       clerkUser.publicMetadata?.subscriptionStatus === "trialing";

  // ✅ Essai gratuit 7 jours : posé côté client dans unsafeMetadata.trialStartedAt.
  // Le serveur DOIT le reconnaître, sinon un nouvel inscrit en essai reçoit un 403
  // « réservé aux membres Premium » et ne peut PAS faire son 1er diagnostic.
  const TRIAL_MS   = 7 * 24 * 60 * 60 * 1000;
  const trialMeta  = clerkUser.unsafeMetadata || clerkUser.unsafe_metadata || {};
  const trialStart = Number(trialMeta.trialStartedAt) || 0;
  const isTrial    = trialStart > 0 && Date.now() < trialStart + TRIAL_MS;

  // Premium invité — vérité serveur : user_access.status === "guest"
  // (le Premium d'un guest n'est PAS dans Clerk, il vit dans Supabase)
  let isGuest = false;
  if (!isAdmin && !isPremium) {
    try {
      const { createClient } = require("@supabase/supabase-js");
      const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const { data: ua } = await sb
        .from("user_access")
        .select("status")
        .eq("user_id", clerkUserId)
        .maybeSingle();
      isGuest = ua?.status === "guest";
    } catch (e) {
      console.warn("[MG360] guest check (analyze-lawn) :", e.message);
    }
  }

  if (!isAdmin && !isPremium && !isGuest && !isTrial) {
    return res.status(403).json({ error: "Fonctionnalité réservée aux membres Premium" });
  }

  // ✅ RATE LIMITING — max 3 diagnostics par jour par user
  try {
    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const today    = new Date().toISOString().split("T")[0];
    const rateKey  = `diag_${clerkUserId}_${today}`;

    const { data: rateData } = await supabase
      .from("rate_limits")
      .select("count")
      .eq("key", rateKey)
      .maybeSingle();

    const currentCount = rateData?.count || 0;
    if (!isAdmin && currentCount >= 3) {
      return res.status(429).json({ error: "Limite atteinte — 3 diagnostics maximum par jour. Revenez demain !" });
    }

    // Incrémenter le compteur
    await supabase.from("rate_limits").upsert(
      { key: rateKey, count: currentCount + 1, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  } catch (e) {
    console.warn("[MG360] rate_limit check failed (non bloquant):", e.message);
    // Non bloquant — on continue si la table rate_limits est indisponible
  }

  try {
    const { imageBase64, mimeType = "image/jpeg", profile = {}, weather = {}, score = 0, userId } = req.body;
    const resolvedUserId = userId || clerkUserId;
    if (!imageBase64) throw new Error("Image manquante");

    // ── 1. UPLOAD CLOUDINARY ──────────────────────────────────────────────
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey    = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const timestamp = Math.floor(Date.now() / 1000);
    const folder    = "mg360-diagnostics";
    const uploadDate = new Date().toISOString().split("T")[0];
    const tags       = `mg360,diag-${uploadDate}`;

    const signString = `folder=${folder}&tags=${tags}&timestamp=${timestamp}${apiSecret}`;
    const signature  = crypto.createHash("sha1").update(signString).digest("hex");

    const formData = new URLSearchParams();
    formData.append("file",      `data:${mimeType};base64,${imageBase64}`);
    formData.append("api_key",   apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("folder",    folder);
    formData.append("tags",      tags);

    const uploadRes  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST", body: formData
    });
    const uploadData = await uploadRes.json();
    if (uploadData.error) throw new Error("Cloudinary: " + uploadData.error.message);

    const imageUrl = uploadData.secure_url;
    const publicId = uploadData.public_id;

    // Version RÉDUITE de l'image, uniquement pour l'appel Groq : moins de pixels
    // = moins de tokens "vision" = on reste plus facilement sous la limite Groq
    // (8000 tokens/min) → beaucoup moins de 429. N'affecte NI le stockage NI
    // l'affichage : l'image pleine résolution (imageUrl) reste intacte pour
    // l'historique et le partage. c_limit ne réduit que si l'image est plus grande.
    const groqImageUrl = imageUrl.replace(
      "/image/upload/",
      "/image/upload/w_768,c_limit,q_auto/"
    );

    // ── 2. ANALYSE GROQ VISION ────────────────────────────────────────────
    const isSynth   = profile?.isSynthetique || profile?.pelouse === "synthetique" ||
      (Array.isArray(profile?.gazons) && profile.gazons.includes("synthetique"));
    const isBermuda = profile?.pelouse === "bermuda" ||
      (Array.isArray(profile?.gazons) && profile.gazons.includes("bermuda"));
    const isOmbre   = profile?.pelouse === "ombre" ||
      (Array.isArray(profile?.gazons) && profile.gazons.includes("ombre"));
    const isRustiq  = profile?.pelouse === "rustique" ||
      (Array.isArray(profile?.gazons) && profile.gazons.includes("rustique"));
    const isSport   = profile?.pelouse === "sport" ||
      (Array.isArray(profile?.gazons) && profile.gazons.includes("sport"));
    const isNaturel = profile?.objectif === "naturel";

    const typeGazon  = profile?.gazons?.join("+") || profile?.pelouse || "universel";
    const moisActuel = new Date().getMonth() + 1;

    // Règles KB v3 injectées selon le profil
    const reglesProfil = [
      isSynth   ? "GAZON SYNTHÉTIQUE : solutions uniquement mécaniques (nettoyage, brossage, granulats). Ne jamais recommander tonte, engrais, arrosage, désherbant, scarification, aération, semences." : null,
      isBermuda && [11,12,1,2,3].includes(moisActuel) ? "BERMUDA DORMANT (hiver) : brun normal, aucune intervention. Ne pas recommander de traitement." : null,
      isOmbre   ? "GAZON OMBRE : hauteur tonte minimum 6-8cm. Pas de scarification. Surveiller oïdium et mousse." : null,
      isRustiq  ? "GAZON RUSTIQUE : tonte haute 7-10cm minimum. Pas de désherbant (trèfle protégé). Engrais organique uniquement." : null,
      isSport   ? "GAZON SPORT : sensible helminthosporiose par chaleur. Hauteur tonte 3-4cm, jamais <2.5cm. Besoin eau élevé." : null,
      isNaturel ? "OBJECTIF NATUREL : recommander uniquement produits bio (engrais organique, soufre anti-mousse, désherbage manuel). Pas de chimique." : null,
      profile?.sol === "calcaire" ? "SOL CALCAIRE : risque chlorose (carence fer/manganèse). Pas d'engrais acide. Signaler si jaunissement." : null,
      profile?.sol === "argileux" ? "SOL ARGILEUX : risque compaction et anaérobie. Priorité aération si sol dur." : null,
    ].filter(Boolean).join(" | ");

    const profileCtx = [
      `Type: ${typeGazon}`,
      profile?.sol ? `Sol: ${profile.sol}` : null,
      profile?.surface ? `Surface: ${profile.surface}m²` : null,
      profile?.exposition ? `Exposition: ${profile.exposition}` : null,
      profile?.objectif ? `Objectif: ${profile.objectif}` : null,
    ].filter(Boolean).join(", ");

    const weatherCtx = weather.temp_max
      ? `Temp: ${Math.round(weather.temp_max)}°C/${Math.round(weather.temp_min||0)}°C, Pluie: ${weather.precip||0}mm, Humidité: ${weather.humidity||0}%`
      : "Météo indisponible";

    const prompt = isSynth
      ? `Tu es un expert gazon synthétique pour Mongazon360.
Analyse cette photo de gazon synthétique.
RÈGLE ABSOLUE: ne jamais recommander tonte, engrais, arrosage, scarification, aération ou désherbant.
Profil: ${profileCtx}. ${weatherCtx}. Score actuel: ${score}/100.

Réponds UNIQUEMENT avec ce JSON valide (sans balises markdown) :
{
  "etat_general": "excellent|bon|moyen|mauvais|critique",
  "score_visuel": <0-100>,
  "emoji": "😊|😐|😟|😰|💀",
  "resume": "2 phrases maximum sur l'état du synthétique",
  "problemes": [{"id":"slug","nom":"Nom","description":"Description","severite":"faible|moyenne|elevee|critique","impact_score":<-30 à 0>,"solution":"Action mécanique uniquement"}],
  "points_positifs": ["Point 1"],
  "actions_urgentes": ["Action entretien synthétique uniquement"],
  "actions_prochaines": ["Action entretien synthétique uniquement"]
}
Problèmes synthétique à détecter : granulats tassés, drainage obstrué, décoloration UV, saleté, moisissures, dégradation fibres.`
      : `Expert agronome gazon pour Mongazon360. Analyse cette photo et fournis un diagnostic.
Contexte: ${profileCtx}. ${weatherCtx}. Score actuel: ${score}/100.
${reglesProfil ? `RÈGLES KB OBLIGATOIRES: ${reglesProfil}` : ""}
BARÈME score_visuel (échelle EXIGEANTE, à respecter strictement) : 90-100 exceptionnel (green de golf, aucun défaut visible, TRÈS RARE) · 75-89 excellent (dense et homogène, défauts mineurs seulement) · 60-74 bon (sain avec imperfections visibles = un BEAU GAZON ORDINAIRE bien entretenu) · 45-59 moyen (zones clairsemées, jaunissements, stress marqué) · 30-44 mauvais (zones mortes, maladie, mauvaises herbes) · 0-29 critique (très dégradé ou quasi inexistant).
CALIBRAGE OBLIGATOIRE : (1) note ≥80 = RARE ; un beau gazon vert et dense "normal" est 60-74, PAS 90. (2) Ne pénalise QUE les défauts clairement VISIBLES sur la photo — n'invente jamais un défaut supposé. (3) La météo (chaleur, sécheresse, pluie) n'est PAS un défaut du gazon. (4) Exigeant mais juste : ni trop sévère ni trop généreux.
Réponds UNIQUEMENT en JSON valide (sans markdown, sans texte autour), 3 problèmes MAXIMUM, descriptions courtes :
{"etat_general":"excellent|bon|moyen|mauvais|critique","score_visuel":<0-100>,"emoji":"😊|😐|😟|😰|💀","resume":"2 phrases max adaptées au type et objectif","problemes":[{"id":"slug","nom":"Nom","description":"courte","severite":"faible|moyenne|elevee|critique","impact_score":<-30 à 0>,"solution":"action concrète adaptée au profil (bio si objectif naturel)"}],"points_positifs":["..."],"actions_urgentes":["..."],"actions_prochaines":["..."]}
Problèmes à détecter selon le type : Universel/Sport/Ornement = oïdium, helminthosporiose, fusariose, anthracnose, mousse, mauvaises herbes, zones mortes, manque eau, brûlures azote, sol compacté, tallage excessif, tonte incorrecte · Ombre = oïdium (prioritaire), mousse, tallage faible · Rustique = espèces indésirables, zones sèches · Bermuda = dormance vs maladie, pythium en été.
Si la photo ne montre pas de gazon : score_visuel 0 et explique dans resume.`;

    const groqBody = JSON.stringify({
      model:       "qwen/qwen3.8-27b",   // migré depuis qwen3.6-27b (déprécié Groq, décommissionné le 14/09) — 3.8 = remplacement 1:1, multimodal + mêmes params reasoning/JSON
      max_tokens:  1000,                  // réduit de 1500 → moins de tokens de sortie (marge palier gratuit Groq)
      temperature: 0.2,
      // qwen est un modèle "thinking" : sans ces réglages, il enrobe sa réponse
      // de raisonnement et le JSON.parse échoue (→ fallback "Analyse incomplète").
      reasoning_effort: "none",                  // désactive le raisonnement (qwen3)
      reasoning_format: "hidden",                // requis avec le JSON mode
      response_format:  { type: "json_object" }, // force une sortie JSON valide
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: groqImageUrl } },
          { type: "text", text: prompt }
        ]
      }]
    });

    const callGroq = () => fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: groqBody
    });

    // ── Appel Groq avec ré-essais sur rate limit (429) ───────────────────
    // Le palier Groq plafonne à 8000 tokens/minute (partagé entre TOUS les
    // utilisateurs). Une analyse rapprochée d'une autre → 429 « try again in Xs ».
    // On respecte le délai indiqué et on réessaie jusqu'à 3 fois, silencieusement,
    // en restant sous la maxDuration (30s) de la fonction. L'utilisateur ne voit
    // le message d'attente que si les 3 tentatives échouent.
    async function callGroqWithRetry(maxAttempts = 3) {
      let res, raw;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        res = await callGroq();
        raw = await res.text();
        if (res.status !== 429) return { res, raw };
        if (attempt === maxAttempts) break;
        const m      = raw.match(/try again in ([\d.]+)s/i);
        const waitMs = Math.min(6000, Math.round((m ? parseFloat(m[1]) : 3) * 1000) + 400);
        console.warn(`[MG360] Groq 429 — tentative ${attempt}/${maxAttempts}, retry dans ${waitMs}ms`);
        await new Promise(r => setTimeout(r, waitMs));
      }
      return { res, raw };
    }
    let { res: groqRes, raw: groqRawText } = await callGroqWithRetry();

    // ── Gestion robuste de la réponse Groq ───────────────────────────────
    // Lire le texte brut AVANT de tenter JSON.parse
    // Évite "Unexpected token 'R'" quand Groq renvoie une erreur HTTP en texte
    let groqData;
    try {
      groqData = JSON.parse(groqRawText);
    } catch {
      // Groq a retourné du texte brut (erreur HTTP, rate limit, etc.)
      console.error("Groq réponse non-JSON:", groqRawText.slice(0, 200));
      throw new Error("Service IA temporairement indisponible. Réessaie dans quelques secondes.");
    }

    if (groqData.error) {
      // On journalise le détail complet côté serveur, mais on ne montre JAMAIS
      // le texte brut de Groq à l'utilisateur (fuite d'infos internes / facturation).
      console.error("[MG360] Groq error:", groqData.error.message || groqData.error);
      const isRate = groqRes.status === 429 ||
                     groqData.error.code === "rate_limit_exceeded" ||
                     /rate.?limit/i.test(groqData.error.message || "");
      throw new Error(isRate
        ? "Nos serveurs d'analyse sont très sollicités en ce moment 😅 Patiente quelques secondes et relance — ce n'est pas lié à toi."
        : "Service IA temporairement indisponible. Réessaie dans quelques secondes.");
    }

    const rawText = groqData.choices?.[0]?.message?.content || "";

    // Extraire le JSON de la réponse en nettoyant les balises markdown éventuelles
    let analysis;
    try {
      const cleaned = rawText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      // Trouver le premier { et le dernier } pour isoler le JSON
      const start = cleaned.indexOf("{");
      const end   = cleaned.lastIndexOf("}");
      if (start === -1 || end === -1) throw new Error("Pas de JSON trouvé");
      analysis = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      // Fallback si l'IA ne retourne pas du JSON valide
      analysis = {
        etat_general:       "moyen",
        score_visuel:       50,
        emoji:              "😐",
        resume:             "Analyse incomplète. Prenez une photo plus nette en pleine lumière.",
        problemes:          [],
        points_positifs:    [],
        actions_urgentes:   ["Relancer le diagnostic avec une meilleure photo"],
        actions_prochaines: []
      };
    }

    // ── 3. SAUVEGARDE SUPABASE ────────────────────────────────────────────
    if (resolvedUserId) {
      try {
        const { createClient } = require("@supabase/supabase-js");
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_KEY
        );
        await supabase.from("diagnostics").insert({
          user_id:        resolvedUserId,
          image_url:      imageUrl,
          public_id:      publicId,
          etat_general:   analysis.etat_general || null,
          score_visuel:   analysis.score_visuel || null,
          resume:         analysis.resume || null,
          problemes:      analysis.problemes || [],
          points_positifs: analysis.points_positifs || [],
          actions_urgentes: analysis.actions_urgentes || [],
        });
      } catch (e) {
        console.error("Supabase save diagnostic:", e.message);
        // Non bloquant — on renvoie quand même le résultat au client
      }
    }

    res.json({ success: true, imageUrl, publicId, analysis, date: new Date().toISOString() });

  } catch (e) {
    console.error("analyze-lawn:", e.message);
    res.status(500).json({ error: e.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// DIAGNOSTIC ANONYME (sans inscription) — « valeur d'abord »
// Un visiteur fait 1 diagnostic sans compte, voit son score + un aperçu, puis
// s'inscrit pour débloquer l'analyse complète (rattachée au compte via claim).
// Anti-abus : 1 / appareil (anonId) + 2 / jour / IP. Stockage service_role.
// ════════════════════════════════════════════════════════════════════════════
const SB_URL_A = process.env.SUPABASE_URL;
const SB_KEY_A = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

function sbClientAnon() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(SB_URL_A, SB_KEY_A);
}

async function uploadToCloudinaryAnon(imageBase64, mimeType) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const timestamp = Math.floor(Date.now() / 1000);
  const folder    = "mg360-diagnostics";
  const uploadDate = new Date().toISOString().split("T")[0];
  const tags       = `mg360,anon,diag-${uploadDate}`;
  const signString = `folder=${folder}&tags=${tags}&timestamp=${timestamp}${apiSecret}`;
  const signature  = crypto.createHash("sha1").update(signString).digest("hex");
  const formData = new URLSearchParams();
  formData.append("file", `data:${mimeType};base64,${imageBase64}`);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("folder", folder);
  formData.append("tags", tags);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: formData });
  const d = await r.json();
  if (d.error) throw new Error("Cloudinary: " + d.error.message);
  return { imageUrl: d.secure_url, publicId: d.public_id };
}

async function groqChatWithRetryAnon(groqBody, maxAttempts = 3) {
  const call = () => fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
    body: groqBody,
  });
  let res, raw;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    res = await call();
    raw = await res.text();
    if (res.status !== 429) return { res, raw };
    if (attempt === maxAttempts) break;
    const m = raw.match(/try again in ([\d.]+)s/i);
    const waitMs = Math.min(6000, Math.round((m ? parseFloat(m[1]) : 3) * 1000) + 400);
    await new Promise(r => setTimeout(r, waitMs));
  }
  return { res, raw };
}

// Analyse générique (sans profil — le visiteur anonyme n'en a pas encore).
async function runAnonDiagnostic({ imageBase64, mimeType = "image/jpeg", weather = {}, score = 0 }) {
  const { imageUrl, publicId } = await uploadToCloudinaryAnon(imageBase64, mimeType);
  const groqImageUrl = imageUrl.replace("/image/upload/", "/image/upload/w_768,c_limit,q_auto/");
  const weatherCtx = weather && weather.temp_max
    ? `Temp: ${Math.round(weather.temp_max)}°C, Pluie: ${weather.precip || 0}mm`
    : "Météo indisponible";
  const prompt = `Expert agronome gazon pour Mongazon360. Analyse cette photo et fournis un diagnostic.
${weatherCtx}. Score de référence: ${score}/100.
BARÈME score_visuel (échelle EXIGEANTE) : 90-100 exceptionnel (green de golf, aucun défaut, TRÈS RARE) · 75-89 excellent (dense, homogène, défauts mineurs) · 60-74 bon (sain avec imperfections = un beau gazon ordinaire bien entretenu) · 45-59 moyen (zones clairsemées, jaunissements, stress) · 30-44 mauvais (zones mortes, maladie, herbes) · 0-29 critique.
CALIBRAGE : (1) note ≥80 = RARE ; un beau gazon normal est 60-74, pas 90. (2) Ne pénalise QUE les défauts clairement visibles, n'invente rien. (3) La météo n'est PAS un défaut du gazon. (4) Exigeant mais juste.
Réponds UNIQUEMENT en JSON valide (sans markdown), 3 problèmes MAXIMUM, descriptions courtes :
{"etat_general":"excellent|bon|moyen|mauvais|critique","score_visuel":<0-100>,"emoji":"😊|😐|😟|😰|💀","resume":"2 phrases max","problemes":[{"id":"slug","nom":"Nom","description":"courte","severite":"faible|moyenne|elevee|critique","impact_score":<-30 à 0>,"solution":"action concrète"}],"points_positifs":["..."],"actions_urgentes":["..."],"actions_prochaines":["..."]}
Si la photo ne montre pas de gazon : score_visuel 0 et explique dans resume.`;
  const groqBody = JSON.stringify({
    model: "qwen/qwen3.8-27b",
    max_tokens: 1000,
    temperature: 0.2,
    reasoning_effort: "none",
    reasoning_format: "hidden",
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: [
      { type: "image_url", image_url: { url: groqImageUrl } },
      { type: "text", text: prompt },
    ] }],
  });
  const { res: groqRes, raw: groqRaw } = await groqChatWithRetryAnon(groqBody);
  let groqData;
  try { groqData = JSON.parse(groqRaw); }
  catch { throw new Error("Service IA temporairement indisponible. Réessaie dans quelques secondes."); }
  if (groqData.error) {
    const isRate = groqRes.status === 429 || /rate.?limit/i.test(groqData.error.message || "");
    throw new Error(isRate
      ? "Nos serveurs d'analyse sont très sollicités 😅 Patiente quelques secondes et relance."
      : "Service IA temporairement indisponible. Réessaie dans quelques secondes.");
  }
  const rawText = groqData.choices?.[0]?.message?.content || "";
  let analysis;
  try {
    const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
    if (s === -1 || e === -1) throw new Error("no json");
    analysis = JSON.parse(cleaned.slice(s, e + 1));
  } catch {
    analysis = { etat_general: "moyen", score_visuel: 50, emoji: "😐",
      resume: "Analyse incomplète. Prends une photo plus nette en pleine lumière.",
      problemes: [], points_positifs: [], actions_urgentes: ["Relancer avec une meilleure photo"], actions_prochaines: [] };
  }
  return { imageUrl, publicId, analysis };
}

async function handleAnonymousDiagnostic(req, res) {
  const { imageBase64, mimeType = "image/jpeg", weather = {}, score = 0, anonId } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: "Image manquante" });
  if (!anonId || String(anonId).length < 8) return res.status(400).json({ error: "Session invalide" });

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const today = new Date().toISOString().split("T")[0];
  const deviceKey = `anondev_${anonId}`;
  const ipKey = `anonip_${ip}_${today}`;
  try {
    const supabase = sbClientAnon();
    const { data: dev } = await supabase.from("rate_limits").select("count").eq("key", deviceKey).maybeSingle();
    if ((dev?.count || 0) >= 1) {
      return res.status(429).json({ error: "trial_used", message: "Tu as déjà utilisé ton diagnostic gratuit 🌱 Crée ton compte pour continuer — 7 jours Premium offerts !" });
    }
    const { data: ipd } = await supabase.from("rate_limits").select("count").eq("key", ipKey).maybeSingle();
    if ((ipd?.count || 0) >= 2) {
      return res.status(429).json({ error: "ip_limit", message: "Trop de diagnostics gratuits depuis ce réseau aujourd'hui. Crée ton compte pour continuer." });
    }
    await supabase.from("rate_limits").upsert({ key: deviceKey, count: (dev?.count || 0) + 1, updated_at: new Date().toISOString() }, { onConflict: "key" });
    await supabase.from("rate_limits").upsert({ key: ipKey, count: (ipd?.count || 0) + 1, updated_at: new Date().toISOString() }, { onConflict: "key" });
  } catch (e) {
    console.warn("[MG360] anon rate_limit (non bloquant):", e.message);
  }

  try {
    const { imageUrl, publicId, analysis } = await runAnonDiagnostic({ imageBase64, mimeType, weather, score });
    try {
      const supabase = sbClientAnon();
      await supabase.from("diagnostics_anon").insert({
        anon_id: anonId, image_url: imageUrl, public_id: publicId,
        etat_general: analysis.etat_general || null, score_visuel: analysis.score_visuel || null,
        resume: analysis.resume || null, problemes: analysis.problemes || [],
        points_positifs: analysis.points_positifs || [], actions_urgentes: analysis.actions_urgentes || [],
        actions_prochaines: analysis.actions_prochaines || [],
      });
    } catch (e) { console.error("[MG360] anon save:", e.message); }
    return res.json({ success: true, imageUrl, analysis, date: new Date().toISOString() });
  } catch (e) {
    console.error("[MG360] anon analyze:", e.message);
    return res.status(500).json({ error: e.message });
  }
}

// Rattache le dernier diagnostic anonyme au compte fraîchement créé (Clerk requis).
async function handleClaimAnon(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Token manquant" });
  let uid;
  try {
    const parts = authHeader.replace("Bearer ", "").split(".");
    if (parts.length !== 3) throw new Error("JWT");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    uid = payload.sub || payload.user_id;
    if (!uid) throw new Error("sub");
    await clerk.users.getUser(uid);
  } catch { return res.status(401).json({ error: "Token invalide" }); }

  const anonId = req.body?.anonId;
  if (!anonId) return res.status(400).json({ error: "anonId manquant" });

  try {
    const supabase = sbClientAnon();
    const { data: rows } = await supabase.from("diagnostics_anon")
      .select("*").eq("anon_id", anonId).order("created_at", { ascending: false }).limit(1);
    const row = rows && rows[0];
    if (!row) return res.json({ success: true, claimed: false });

    await supabase.from("diagnostics").insert({
      user_id: uid, image_url: row.image_url, public_id: row.public_id,
      etat_general: row.etat_general, score_visuel: row.score_visuel, resume: row.resume,
      problemes: row.problemes || [], points_positifs: row.points_positifs || [],
      actions_urgentes: row.actions_urgentes || [],
    });
    await supabase.from("diagnostics_anon").delete().eq("anon_id", anonId);
    return res.json({ success: true, claimed: true });
  } catch (e) {
    console.error("[MG360] claim-anon:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
