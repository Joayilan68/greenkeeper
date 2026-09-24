// api/aiModels.cjs
// Modèles Groq utilisés par l'application — source unique, aussi vérifiée par
// Pilotage → Services (détection d'un modèle déprécié ou décommissionné par Groq).
module.exports = {
  VISION_MODEL: "qwen/qwen3.8-27b",   // diagnostic photo (analyze-lawn.js)
  TEXT_MODEL:   "openai/gpt-oss-20b", // Bob (ai-assistant.js) + recommandations (ai-recommendations.js)
};
