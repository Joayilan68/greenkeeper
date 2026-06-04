// api/rgpd-data.js
// ════════════════════════════════════════════════════════════════════════════
// MONGAZON360™ — Conformité RGPD complète
// ════════════════════════════════════════════════════════════════════════════
//
// GET    /api/rgpd-data → Export complet des données (RGPD Art. 20 — Portabilité)
// DELETE /api/rgpd-data → Suppression cascade complète (RGPD Art. 17 — Effacement)
//
// CASCADE DE SUPPRESSION :
//   1. Photos Cloudinary (folder mg360-diagnostics/<user_id>)
//   2. Toutes les tables Supabase : profiles, histories, greenpoints, streaks,
//      diagnostics, reminders, user_consents, user_access, push_subscriptions
//   3. Table preinscriptions (par email récupéré via Clerk)
//   4. Compte Clerk (DELETE /v1/users/{user_id})
//
// SÉCURITÉ : authentification Bearer token Clerk obligatoire
// ════════════════════════════════════════════════════════════════════════════

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Vérification token Clerk ──────────────────────────────────────────────────
async function verifyClerkToken(token) {
  const res = await fetch("https://api.clerk.com/v1/tokens/verify", {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${process.env.CLERK_SECRET_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error("Token invalide");
  const data = await res.json();
  const userId = data.sub || data.user_id;
  if (!userId) throw new Error("user_id introuvable");
  return userId;
}

// ── Récupération email Clerk (pour suppression preinscriptions par email) ────
async function getClerkUserEmail(userId) {
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { "Authorization": `Bearer ${process.env.CLERK_SECRET_KEY}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.email_addresses?.[0]?.email_address || null;
  } catch {
    return null;
  }
}

// ── Suppression photos Cloudinary par folder utilisateur ─────────────────────
async function deleteCloudinaryFolder(userId) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return { deleted: 0, error: "Cloudinary credentials manquantes" };
  }

  try {
    const folder    = `mg360-diagnostics/${userId}`;
    const timestamp = Math.round(Date.now() / 1000);

    // Étape 1 : Lister toutes les ressources du folder utilisateur
    const listAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const listRes  = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?prefix=${folder}&max_results=500`,
      { headers: { "Authorization": `Basic ${listAuth}` } }
    );

    if (!listRes.ok) {
      return { deleted: 0, error: `Cloudinary list failed: ${listRes.status}` };
    }

    const { resources } = await listRes.json();
    if (!resources || resources.length === 0) {
      return { deleted: 0, info: "Aucune photo à supprimer" };
    }

    // Étape 2 : Supprimer en batch (max 100 par appel selon Cloudinary)
    const publicIds = resources.map(r => r.public_id);
    let deletedTotal = 0;

    for (let i = 0; i < publicIds.length; i += 100) {
      const batch         = publicIds.slice(i, i + 100);
      const batchTimestamp = Math.round(Date.now() / 1000);

      // Signature Cloudinary pour DELETE
      const paramsToSign = `public_ids[]=${batch.join("&public_ids[]=")}&timestamp=${batchTimestamp}`;
      const signature    = crypto
        .createHash("sha1")
        .update(paramsToSign + apiSecret)
        .digest("hex");

      const formData = new URLSearchParams();
      batch.forEach(id => formData.append("public_ids[]", id));
      formData.append("timestamp", batchTimestamp.toString());
      formData.append("api_key", apiKey);
      formData.append("signature", signature);

      const delRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload`,
        {
          method:  "DELETE",
          headers: { "Authorization": `Basic ${listAuth}` },
          body:    formData,
        }
      );

      if (delRes.ok) {
        const result = await delRes.json();
        deletedTotal += Object.keys(result.deleted || {}).length;
      }
    }

    return { deleted: deletedTotal };
  } catch (e) {
    return { deleted: 0, error: e.message };
  }
}

// ── Suppression compte Clerk ─────────────────────────────────────────────────
async function deleteClerkAccount(userId) {
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      method:  "DELETE",
      headers: { "Authorization": `Bearer ${process.env.CLERK_SECRET_KEY}` },
    });
    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `Clerk ${res.status}: ${err}` };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // ── Authentification Clerk ─────────────────────────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant" });
  }

  let userId;
  try {
    userId = await verifyClerkToken(authHeader.replace("Bearer ", ""));
  } catch (e) {
    return res.status(401).json({ error: "Authentification échouée : " + e.message });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GET — Export RGPD Article 20 (Portabilité)
  // ══════════════════════════════════════════════════════════════════════════
  if (req.method === "GET") {
    try {
      // Récupérer email pour preinscriptions
      const email = await getClerkUserEmail(userId);

      // Récupérer toutes les données en parallèle
      const [
        profileRes,
        historyRes,
        greenRes,
        streakRes,
        diagsRes,
        remindersRes,
        consentsRes,
        accessRes,
        pushSubRes,
        preinscriptionRes,
      ] = await Promise.allSettled([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("histories").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("greenpoints").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("streaks").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("diagnostics").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("reminders").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_consents").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_access").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("push_subscriptions").select("*").eq("user_id", userId).maybeSingle(),
        email
          ? supabase.from("preinscriptions").select("*").eq("email", email).maybeSingle()
          : Promise.resolve({ value: { data: null } }),
      ]);

      const getData = (r) => (r.status === "fulfilled" ? r.value?.data : null);

      return res.status(200).json({
        // ── Métadonnées RGPD ─────────────────────────────────────────────────
        meta: {
          export_date:    new Date().toISOString(),
          droits_rgpd:    "Données exportées conformément au RGPD — Article 20 (droit à la portabilité)",
          format:         "JSON v1",
          responsable:    "Mongazon360™ — auto-entrepreneur immatriculé en France",
          contact_dpo:    "contact@mongazon360.fr",
          marque_deposee: "Mongazon360™ — Marque déposée à l'EUIPO (30/05/2026) — Classes 9, 42, 44 — 27 pays UE",
          user_id:        userId,
          email:          email || "non récupéré",
        },

        // ── Données utilisateur ──────────────────────────────────────────────
        profil:              getData(profileRes)?.data || getData(profileRes) || null,
        historique_actions:  getData(historyRes) || [],
        diagnostics_photos:  getData(diagsRes) || [],

        gamification: {
          greenpoints: {
            total:       getData(greenRes)?.total || 0,
            historique:  getData(greenRes)?.historique || [],
            recompenses: getData(greenRes)?.recompenses || [],
          },
          streak: {
            actuel:             getData(streakRes)?.actuel || 0,
            record:             getData(streakRes)?.record || 0,
            derniere_connexion: getData(streakRes)?.derniere_connexion || null,
          },
        },

        rappels_entretien:   getData(remindersRes) || null,
        consentements_rgpd:  getData(consentsRes) || null,
        statut_acces:        getData(accessRes) || null,
        abonnement_push:     getData(pushSubRes) ? "Présent (détails masqués pour sécurité)" : "Aucun",
        waitlist:            getData(preinscriptionRes) || null,
      });
    } catch (e) {
      console.error("[RGPD] GET export error:", e.message);
      return res.status(500).json({ error: "Erreur lors de l'export : " + e.message });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DELETE — Suppression RGPD Article 17 (Effacement / Droit à l'oubli)
  // ══════════════════════════════════════════════════════════════════════════
  if (req.method === "DELETE") {
    const report = {
      success:           true,
      timestamp:         new Date().toISOString(),
      user_id:           userId,
      cloudinary:        null,
      supabase_tables:   {},
      preinscriptions:   null,
      clerk_account:     null,
      errors:            [],
    };

    try {
      // ── Étape 0 : récupérer l'email AVANT de supprimer Clerk
      const email = await getClerkUserEmail(userId);

      // ── Étape 1 : Cloudinary (photos diagnostics) ──────────────────────────
      report.cloudinary = await deleteCloudinaryFolder(userId);

      // ── Étape 2 : Toutes les tables Supabase avec user_id ─────────────────
      const supabaseTables = [
        "profiles",
        "histories",
        "diagnostics",
        "greenpoints",
        "streaks",
        "reminders",
        "user_consents",
        "user_access",
        "push_subscriptions",
      ];

      const tableResults = await Promise.allSettled(
        supabaseTables.map(table =>
          supabase.from(table).delete().eq("user_id", userId)
        )
      );

      tableResults.forEach((r, i) => {
        const table = supabaseTables[i];
        if (r.status === "fulfilled" && !r.value?.error) {
          report.supabase_tables[table] = "✅ supprimé";
        } else {
          const err = r.reason?.message || r.value?.error?.message || "erreur inconnue";
          report.supabase_tables[table] = `⚠️ ${err}`;
          report.errors.push(`Supabase.${table}: ${err}`);
        }
      });

      // ── Étape 3 : Table preinscriptions (par email) ───────────────────────
      if (email) {
        const { error: preErr } = await supabase
          .from("preinscriptions")
          .delete()
          .eq("email", email);

        if (preErr) {
          report.preinscriptions = `⚠️ ${preErr.message}`;
          report.errors.push(`preinscriptions: ${preErr.message}`);
        } else {
          report.preinscriptions = "✅ supprimé";
        }
      } else {
        report.preinscriptions = "⏭️ ignoré (email non récupéré)";
      }

      // ── Étape 4 : Suppression compte Clerk (DERNIÈRE étape) ───────────────
      const clerkResult = await deleteClerkAccount(userId);
      if (clerkResult.success) {
        report.clerk_account = "✅ supprimé définitivement";
      } else {
        report.clerk_account = `⚠️ ${clerkResult.error}`;
        report.errors.push(`Clerk: ${clerkResult.error}`);
      }

      // ── Résumé final ──────────────────────────────────────────────────────
      report.success = report.errors.length === 0;
      report.message = report.success
        ? "✅ Toutes vos données ont été supprimées conformément au RGPD Article 17"
        : "⚠️ Suppression partielle — voir le détail des erreurs";

      return res.status(200).json(report);
    } catch (e) {
      console.error("[RGPD] DELETE error:", e.message);
      report.success = false;
      report.errors.push(`Fatal: ${e.message}`);
      return res.status(500).json(report);
    }
  }

  return res.status(405).json({ error: "Méthode non autorisée — GET ou DELETE uniquement" });
};
