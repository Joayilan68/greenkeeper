// api/analyze-lawn.js
// Upload image sur Cloudinary puis analyse avec Gemini Vision

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { imageBase64, mimeType = "image/jpeg", profile = {}, weather = {}, score = 0 } = req.body;
    if (!imageBase64) throw new Error("Image manquante");

    // ── 1. UPLOAD CLOUDINARY ──────────────────────────────────────────────
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey    = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const timestamp = Math.floor(Date.now() / 1000);
    const folder    = "mg360-diagnostics";

    const crypto = require("crypto");
    const signString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature  = crypto.createHash("sha1").update(signString).digest("hex");

    const formData = new URLSearchParams();
    formData.append("file",      `data:${mimeType};base64,${imageBase64}`);
    formData.append("api_key",   apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("folder",    folder);

    const uploadRes  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST", body: formData
    });
    const uploadData = await uploadRes.json();
    if (uploadData.error) throw new Error("Cloudinary: " + uploadData.error.message);

    const imageUrl = uploadData.secure_url;
    const publicId = uploadData.public_id;

    // ── 2. ANALYSE GEMINI VISION ──────────────────────────────────────────
    const profileCtx = profile.pelouse
      ? `Type : ${profile.pelouse}, Sol : ${profile.sol}, Surface : ${profile.surface}m²`
      : "Profil non renseigné";
    const weatherCtx = weather.temp_max
      ? `Temp max : ${Math.round(weather.temp_max)}°C, Pluie : ${weather.precip}mm`
      : "Météo indisponible";

    const prompt = `Tu es un expert agronome spécialisé en gazon et pelouses.
Analyse cette photo de gazon et fournis un diagnostic complet.
Contexte : ${profileCtx}. ${weatherCtx}. Score actuel : ${score}/100.

Réponds UNIQUEMENT avec ce JSON valide (sans balises markdown) :
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

Problèmes à détecter : oïdium, helminthosporiose, fusariose, anthracnose, mousse, mauvaises herbes, zones mortes, manque eau, brûlures azote, sol compacté, tallage excessif, hauteur tonte incorrecte.`;

    const gemRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
            { text: prompt }
          ]}],
          generationConfig: { maxOutputTokens: 1200, temperature: 0.2 }
        })
      }
    );
    const gemData = await gemRes.json();
    if (gemData.error) throw new Error("Gemini: " + gemData.error.message);

    const rawText = gemData.candidates?.[0]?.content?.parts?.[0]?.text || "";
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
