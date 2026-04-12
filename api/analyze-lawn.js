// api/analyze-lawn.js
// Upload image sur Cloudinary puis analyse avec Groq Llama Vision (gratuit)

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

    const crypto     = require("crypto");
    const uploadDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
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
            {
              type:      "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` }
            },
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

// ── Route de purge Cloudinary (appelée par cron ou manuellement) ──────────────
// GET /api/analyze-lawn?action=purge&secret=PURGE_SECRET
// Supprime toutes les photos mg360-diagnostics de plus de 90 jours
module.exports.purge = async function purgeOldDiagnostics() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const crypto    = require("crypto");

  // Date limite : aujourd'hui - 90 jours
  const cutoff    = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffTs  = Math.floor(cutoff.getTime() / 1000);

  // Lister les ressources dans mg360-diagnostics uploadées avant la date limite
  const listRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?` +
    `prefix=mg360-diagnostics&max_results=500`,
    {
      headers: {
        Authorization: "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")
      }
    }
  );
  const listData = await listRes.json();
  const toDelete = (listData.resources || [])
    .filter(r => new Date(r.created_at).getTime() / 1000 < cutoffTs)
    .map(r => r.public_id);

  if (!toDelete.length) return { deleted: 0 };

  // Suppression par batch de 100
  const timestamp = Math.floor(Date.now() / 1000);
  const publicIds = toDelete.join(",");
  const signStr   = `public_ids=${publicIds}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(signStr).digest("hex");

  const delRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")
      },
      body: JSON.stringify({ public_ids: toDelete })
    }
  );
  const delData = await delRes.json();
  return { deleted: toDelete.length, detail: delData };
};
