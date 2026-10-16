// api/aiModels.cjs
// Modèles Groq utilisés par l'application — source unique, aussi vérifiée par
// Pilotage → Services (détection d'un modèle déprécié ou décommissionné par Groq).
module.exports = {
  VISION_MODEL: "qwen/qwen3.8-27b",   // diagnostic photo (analyze-lawn.js)
  TEXT_MODEL:   "openai/gpt-oss-20b", // recommandations du jour (ai-recommendations.js)
  BOB_MODEL:    "openai/gpt-oss-120b", // Bob (ai-assistant.js) : suit mieux les consignes ; quota Groq par minute
                                       // propre à chaque modèle, donc séparé de celui des recommandations
};
