// api/purge-diagnostics.js
// ─────────────────────────────────────────────────────────────────────────────
// Supprime les photos Cloudinary mg360-diagnostics de plus de 90 jours
// Sécurisé par token Clerk (admin uniquement)
// POST /api/purge-diagnostics
// ─────────────────────────────────────────────────────────────────────────────

const { createClerkClient } = require("@clerk/backend");
const crypto = require("crypto");

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  // ── Auth : token Clerk requis ─────────────────────────────────────────────
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

    // ── 1. Lister les ressources de plus de 90 jours ─────────────────────
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const listRes  = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?` +
      `prefix=mg360-diagnostics&max_results=500`,
      { headers: { Authorization: `Basic ${authB64}` } }
    );
    const listData = await listRes.json();
    const toDelete = (listData.resources || [])
      .filter(r => new Date(r.created_at) < cutoff)
      .map(r => r.public_id);

    if (!toDelete.length) {
      return res.json({ deleted: 0, message: "Aucune photo à supprimer (< 90 jours)" });
    }

    // ── 2. Suppression ────────────────────────────────────────────────────
    const delRes  = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Basic ${authB64}`,
        },
        body: JSON.stringify({ public_ids: toDelete }),
      }
    );
    const delData = await delRes.json();

    res.json({
      deleted: toDelete.length,
      detail:  delData,
      message: `${toDelete.length} photo(s) supprimée(s) avec succès`,
    });

  } catch (e) {
    console.error("purge-diagnostics:", e.message);
    res.status(500).json({ error: e.message });
  }
};
