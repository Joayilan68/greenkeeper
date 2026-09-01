// api/admin-social.js
// Suivi des followers réseaux sociaux (saisie manuelle mensuelle, admin only).
//
//   GET  /api/admin-social            → séries + comptes + total (dernier snapshot)
//   POST /api/admin-social            → { mois:"YYYY-MM", entries:[{compte,plateforme,followers}] }
//   POST /api/admin-social {action:"delete", compte, plateforme}
//
// Auth : JWT Clerk obligatoire + compte admin (email dans ADMIN_EMAILS ou role=admin).
// Accès Supabase via service_role (la table est en RLS sans policy publique).

const { createClerkClient } = require("@clerk/backend");
const { createClient }      = require("@supabase/supabase-js");

const clerk        = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const ADMIN_EMAILS = ["mongazon360@gmail.com", "jordankrebs1@gmail.com"];

// Supporte les deux noms d'env historiques du projet
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

// Normalise un "YYYY-MM" (ou une date) vers le 1er du mois "YYYY-MM-01"
function toMonthStart(input) {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-01`;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  // ── AUTH ADMIN ─────────────────────────────────────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentification requise" });
  }
  try {
    const token   = authHeader.replace("Bearer ", "");
    const parts   = token.split(".");
    if (parts.length !== 3) throw new Error("JWT malformé");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const uid     = payload.sub || payload.user_id;
    if (!uid) throw new Error("sub manquant");
    const user    = await clerk.users.getUser(uid);
    const email   = (user.emailAddresses?.[0]?.emailAddress || "").toLowerCase();
    const isAdmin = ADMIN_EMAILS.includes(email) || user.publicMetadata?.role === "admin";
    if (!isAdmin) return res.status(403).json({ error: "Accès réservé à l'administrateur" });
  } catch {
    return res.status(401).json({ error: "Token invalide" });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Configuration Supabase manquante" });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // ── POST : enregistrer / supprimer ─────────────────────────────────────────
  if (req.method === "POST") {
    const body = req.body || {};

    if (body.action === "delete") {
      if (!body.compte || !body.plateforme) {
        return res.status(400).json({ error: "compte et plateforme requis" });
      }
      const { error } = await supabase
        .from("social_followers")
        .delete()
        .eq("compte", body.compte)
        .eq("plateforme", body.plateforme);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, deleted: true });
    }

    const mois    = toMonthStart(body.mois);
    const entries = Array.isArray(body.entries) ? body.entries : [];
    if (!mois)            return res.status(400).json({ error: "mois invalide (attendu YYYY-MM)" });
    if (!entries.length)  return res.status(400).json({ error: "aucune entrée à enregistrer" });

    const rows = entries
      .filter(e => e && e.compte && e.plateforme)
      .map(e => ({
        compte:     String(e.compte).trim(),
        plateforme: String(e.plateforme).trim().toLowerCase(),
        mois,
        followers:  Math.max(0, parseInt(e.followers, 10) || 0),
        updated_at: new Date().toISOString(),
      }));
    if (!rows.length) return res.status(400).json({ error: "entrées invalides" });

    const { error } = await supabase
      .from("social_followers")
      .upsert(rows, { onConflict: "compte,plateforme,mois" });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, saved: rows.length });
  }

  // ── GET : lecture + agrégation ─────────────────────────────────────────────
  try {
    const { data, error } = await supabase
      .from("social_followers")
      .select("compte, plateforme, mois, followers")
      .order("mois", { ascending: true });
    if (error) throw error;

    const raw = data || [];

    // Liste des comptes (compte+plateforme) avec leur dernier relevé
    const accMap = new Map(); // clé "compte|plateforme"
    raw.forEach(r => {
      const key = `${r.compte}|${r.plateforme}`;
      const cur = accMap.get(key);
      if (!cur || r.mois > cur.mois) {
        accMap.set(key, { compte: r.compte, plateforme: r.plateforme, mois: r.mois, followers: r.followers });
      }
    });
    const accounts = [...accMap.values()].sort((a, b) => b.followers - a.followers);
    const totalLatest = accounts.reduce((s, a) => s + (a.followers || 0), 0);

    // Séries par mois : total tous comptes + détail par compte
    const monthsSet = [...new Set(raw.map(r => r.mois))].sort();
    const byMonth = monthsSet.map(mois => {
      const rowsM = raw.filter(r => r.mois === mois);
      const perAccount = {};
      rowsM.forEach(r => { perAccount[`${r.compte}|${r.plateforme}`] = r.followers; });
      const total = rowsM.reduce((s, r) => s + (r.followers || 0), 0);
      const label = new Date(mois).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      return { mois, label, total, perAccount };
    });

    // Évolution vs mois précédent (sur le total)
    let deltaTotal = null, deltaPct = null;
    if (byMonth.length >= 2) {
      const last = byMonth[byMonth.length - 1].total;
      const prev = byMonth[byMonth.length - 2].total;
      deltaTotal = last - prev;
      deltaPct   = prev > 0 ? Math.round((deltaTotal / prev) * 1000) / 10 : null;
    }

    return res.json({
      success: true,
      accounts,
      totalLatest,
      byMonth,
      deltaTotal,
      deltaPct,
      hasData: raw.length > 0,
    });
  } catch (e) {
    console.error("[MG360] admin-social GET:", e.message);
    // Table absente (ex : base beta en pause) → réponse vide non bloquante
    return res.json({ success: true, accounts: [], totalLatest: 0, byMonth: [], hasData: false });
  }
};
