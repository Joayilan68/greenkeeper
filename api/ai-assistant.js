// api/ai-assistant.js
// Assistant IA gazon — Groq/Llama 3.1 avec contexte personnalisé

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { messages, profile = {}, weather = {}, score = 0, month = 1 } = req.body;
    if (!messages?.length) throw new Error("Messages manquants");

    const MOIS = ["","Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

    const systemPrompt = `Tu es GreenBot, l'assistant expert en gazon et pelouses de l'application Mon Gazon 360.
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
        model:       "llama-3.1-8b-instant",
        max_tokens:  600,
        temperature: 0.7,
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
