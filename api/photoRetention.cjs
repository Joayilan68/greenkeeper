// api/photoRetention.cjs
// Durée de conservation des photos de diagnostic (registre RGPD) : 90 jours.
// Utilisé par le cron quotidien (send.js, créneau matin) et par le bouton admin
// « Purger » du Pilotage (analyze-lawn.js, action=purge).

const RETENTION_DAYS = 90;
const FOLDER_PREFIX  = "mg360-diagnostics";

async function purgeOldDiagnosticPhotos() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Variables Cloudinary manquantes");

  const auth   = { Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}` };
  const base   = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image`;
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

  // 1. Lister toutes les photos du dossier (pagination par curseur)
  const toDelete = [];
  let cursor = null;
  do {
    const url = `${base}?type=upload&prefix=${FOLDER_PREFIX}&max_results=500${cursor ? `&next_cursor=${cursor}` : ""}`;
    const data = await (await fetch(url, { headers: auth })).json();
    if (data.error) throw new Error(`Cloudinary : ${data.error.message}`);
    for (const r of data.resources || []) {
      if (new Date(r.created_at).getTime() < cutoff) toDelete.push(r.public_id);
    }
    cursor = data.next_cursor || null;
  } while (cursor);

  // 2. Supprimer par lots de 100 (limite de l'API Cloudinary)
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 100) {
    const batch = toDelete.slice(i, i + 100);
    const res = await fetch(`${base}/upload`, {
      method: "DELETE",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ public_ids: batch }),
    });
    const data = await res.json();
    if (data.error) throw new Error(`Cloudinary : ${data.error.message}`);
    deleted += Object.values(data.deleted || {}).filter(v => v === "deleted").length;
  }

  return { deleted, candidates: toDelete.length, retentionDays: RETENTION_DAYS };
}

module.exports = { purgeOldDiagnosticPhotos, RETENTION_DAYS };
