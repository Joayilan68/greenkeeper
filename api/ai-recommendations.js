module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { prompt } = req.body;
    if (!prompt) throw new Error("Prompt manquant");

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          max_tokens: 800,
          temperature: 0.7,
          messages: [{ role: "user", content: prompt }]
        })
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