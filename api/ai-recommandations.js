const Anthropic = require("@anthropic-ai/sdk");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const { prompt } = req.body;
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });
    res.json({ text: message.content[0].text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
