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
    // Auth requis
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
    const { imageBase64, mimeType = "image/jpeg", profile = {}, weather = {}, score = 0 } = req.body;
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
    const profileCtx = profile.pelouse
      ? `Type : ${profile.pelouse}, Sol : ${profile.sol}, Surface : ${profile.surface}m²`
      : "Profil non renseigné";
    const weatherCtx = weather.temp_max
      ? `Temp max : ${Math.round(weather.temp_max)}°C, Pluie : ${weather.precip}mm`
      : "Météo indisponible";

    const prompt = `Tu es un expert agronome spécialisé en gazon et pelouses.
Analyse cette photo de gazon et fournis un diagnostic complet.
Contexte : ${profileCtx}. ${weatherCtx}. Score actuel : ${score}/100.

Réponds UNIQUEMENT avec ce JSON valide (sans balises markdown, sans texte avant ou après) :
{
  "etat_general": "excellent|bon|moyen|mauvais|critique",
  "score_visuel": <0-100>,
  "emoji": "😊|😐|😟|😰|💀",
  "resume": "2 phrases maximum",
  "problemes": [
    {
      "id": "slug_unique",
      "nom": "Nom du problème",
      "description": "Description courte et claire",
      "severite": "faible|moyenne|elevee|critique",
      "impact_score": <-30 à 0>,
      "solution": "Action concrète à faire"
    }
  ],
  "points_positifs": ["Point 1", "Point 2"],
  "actions_urgentes": ["Action urgente 1"],
  "actions_prochaines": ["Action prochaine 1"]
}

Problèmes à détecter : oïdium, helminthosporiose, fusariose, anthracnose, mousse, mauvaises herbes, zones mortes, manque eau, brûlures azote, sol compacté, tallage excessif, hauteur tonte incorrecte.
Si la photo ne montre pas du gazon, retourne score_visuel à 0 et explique dans resume.`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model:       "llama-3.2-11b-vision-preview",
        max_tokens:  1500,
        temperature: 0.2,
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            { type: "text", text: prompt }
          ]
        }]
      })
    });

    const groqData = await groqRes.json();
    if (groqData.error) throw new Error("Groq: " + (groqData.error.message || JSON.stringify(groqData.error)));

    const rawText = groqData.choices?.[0]?.message?.content || "";
    let analysis;
    try {
      analysis = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      analysis = {
        etat_general: "moyen", score_visuel: 50, emoji: "😐",
        resume: "Analyse incomplète. Prenez une photo plus nette en pleine lumière.",
        problemes: [], points_positifs: [],
        actions_urgentes: ["Relancer le diagnostic avec une meilleure photo"],
        actions_prochaines: []
      };
    }

    res.json({ success: true, imageUrl, publicId, analysis, date: new Date().toISOString() });

  } catch (e) {
    console.error("analyze-lawn:", e.message);
    res.status(500).json({ error: e.message });
  }
};
