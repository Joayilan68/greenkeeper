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
      await clerk.verifyToken(authHeader.replace("Bearer ", ""));
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

  // ── Route principale : diagnostic photo ────────────────────────────────────
  try {
    const { imageBase64, mimeType = "image/jpeg", profile = {}, weather = {}, score = 0, userId } = req.body;
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
      : `Tu es un expert agronome spécialisé en gazon et pelouses pour Mongazon360.
Analyse cette photo de gazon et fournis un diagnostic complet.
Contexte: ${profileCtx}. ${weatherCtx}. Score actuel: ${score}/100.
${reglesProfil ? `RÈGLES KB OBLIGATOIRES: ${reglesProfil}` : ""}

Réponds UNIQUEMENT avec ce JSON valide (sans balises markdown, sans texte avant ou après) :
{
  "etat_general": "excellent|bon|moyen|mauvais|critique",
  "score_visuel": <0-100>,
  "emoji": "😊|😐|😟|😰|💀",
  "resume": "2 phrases maximum adaptées au type de gazon et objectif",
  "problemes": [
    {
      "id": "slug_unique",
      "nom": "Nom du problème",
      "description": "Description courte et claire",
      "severite": "faible|moyenne|elevee|critique",
      "impact_score": <-30 à 0>,
      "solution": "Action concrète adaptée au profil (bio si objectif naturel)"
    }
  ],
  "points_positifs": ["Point 1", "Point 2"],
  "actions_urgentes": ["Action urgente adaptée au profil"],
  "actions_prochaines": ["Action prochaine adaptée au profil"]
}

Problèmes à détecter selon le type de gazon :
- Universel/Sport/Ornement : oïdium, helminthosporiose, fusariose, anthracnose, mousse, mauvaises herbes, zones mortes, manque eau, brûlures azote, sol compacté, tallage excessif, hauteur tonte incorrecte
- Ombre : oïdium prioritaire, mousse, tallage faible
- Rustique : envahissement espèces indésirables, zones sèches
- Bermuda : dormance vs maladie, pythium en été
Si la photo ne montre pas du gazon, retourne score_visuel à 0 et explique dans resume.`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model:       "meta-llama/llama-4-scout-17b-16e-instruct",
        max_tokens:  1500,
        temperature: 0.2,
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageUrl } },
            { type: "text", text: prompt }
          ]
        }]
      })
    });

    // ── Gestion robuste de la réponse Groq ───────────────────────────────
    // Lire le texte brut AVANT de tenter JSON.parse
    // Évite "Unexpected token 'R'" quand Groq renvoie une erreur HTTP en texte
    const groqRawText = await groqRes.text();
    let groqData;
    try {
      groqData = JSON.parse(groqRawText);
    } catch {
      // Groq a retourné du texte brut (erreur HTTP, rate limit, etc.)
      console.error("Groq réponse non-JSON:", groqRawText.slice(0, 200));
      throw new Error("Service IA temporairement indisponible. Réessaie dans quelques secondes.");
    }

    if (groqData.error) {
      throw new Error("Groq: " + (groqData.error.message || JSON.stringify(groqData.error)));
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
    if (userId) {
      try {
        const { createClient } = require("@supabase/supabase-js");
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_KEY
        );
        await supabase.from("diagnostics").insert({
          user_id:        userId,
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
