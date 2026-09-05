// api/stats.js
// Fusion de stats-revenue.js et stats-users.js
//
// Usage :
//   GET /api/stats?type=revenue  → stats Stripe
//   GET /api/stats?type=users    → stats Clerk + sources UTM (Clerk + Supabase waitlist)

// Emails admin — exclus de TOUTES les stats (règle "admins exclus de tout")
const ADMIN_EMAILS = ["mongazon360@gmail.com", "jordankrebs1@gmail.com"];

const { createClerkClient } = require("@clerk/backend");
const { createClient }      = require("@supabase/supabase-js");
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  // ── AUTH ADMIN — ces stats (MRR, solde Stripe, comptes) sont confidentielles ──
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

  const { type } = req.query;

  // Réseaux sociaux : lecture (GET ?type=social) + écriture (POST)
  if (type === "social" || req.method === "POST") return handleSocial(req, res);
  if (type === "revenue") return handleRevenue(req, res);
  if (type === "users")   return handleUsers(req, res);

  return res.status(400).json({ error: 'Paramètre ?type=revenue|users|social requis' });
};

// ── Réseaux sociaux (followers — saisie manuelle mensuelle) ───────────────────
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

function toMonthStart(input) {
  if (!input) return null;
  const m = String(input).trim().match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-01` : null;
}

async function handleSocial(req, res) {
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: "Configuration Supabase manquante" });
  const supabase = createClient(SB_URL, SB_KEY);

  // ── POST : enregistrer / supprimer ─────────────────────────────────────────
  if (req.method === "POST") {
    const body = req.body || {};

    if (body.action === "delete") {
      if (!body.compte || !body.plateforme) return res.status(400).json({ error: "compte et plateforme requis" });
      const { error } = await supabase
        .from("social_followers").delete()
        .eq("compte", body.compte).eq("plateforme", body.plateforme);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, deleted: true });
    }

    const mois    = toMonthStart(body.mois);
    const entries = Array.isArray(body.entries) ? body.entries : [];
    if (!mois)           return res.status(400).json({ error: "mois invalide (attendu YYYY-MM)" });
    if (!entries.length) return res.status(400).json({ error: "aucune entrée à enregistrer" });

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
    const accMap = new Map();
    raw.forEach(r => {
      const key = `${r.compte}|${r.plateforme}`;
      const cur = accMap.get(key);
      if (!cur || r.mois > cur.mois) accMap.set(key, { compte: r.compte, plateforme: r.plateforme, mois: r.mois, followers: r.followers });
    });
    const accounts    = [...accMap.values()].sort((a, b) => b.followers - a.followers);
    const totalLatest = accounts.reduce((s, a) => s + (a.followers || 0), 0);

    const monthsSet = [...new Set(raw.map(r => r.mois))].sort();
    const byMonth = monthsSet.map(mois => {
      const rowsM = raw.filter(r => r.mois === mois);
      const perAccount = {};
      rowsM.forEach(r => { perAccount[`${r.compte}|${r.plateforme}`] = r.followers; });
      const total = rowsM.reduce((s, r) => s + (r.followers || 0), 0);
      const label = new Date(mois).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      return { mois, label, total, perAccount };
    });

    let deltaTotal = null, deltaPct = null;
    if (byMonth.length >= 2) {
      const last = byMonth[byMonth.length - 1].total;
      const prev = byMonth[byMonth.length - 2].total;
      deltaTotal = last - prev;
      deltaPct   = prev > 0 ? Math.round((deltaTotal / prev) * 1000) / 10 : null;
    }

    return res.json({ success: true, accounts, totalLatest, byMonth, deltaTotal, deltaPct, hasData: raw.length > 0 });
  } catch (e) {
    console.error("[MG360] stats social:", e.message);
    return res.json({ success: true, accounts: [], totalLatest: 0, byMonth: [], hasData: false });
  }
}

// ── Stats financières (Stripe) ────────────────────────────────────────────────
async function handleRevenue(req, res) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    // ── 1. Abonnements actifs ──────────────────────────────────────────────
    const subRes = await fetch(
      "https://api.stripe.com/v1/subscriptions?status=active&limit=100&expand[]=data.items.data.price",
      { headers: { "Authorization": `Bearer ${stripeKey}` } }
    );
    if (!subRes.ok) throw new Error("Stripe subscriptions error: " + subRes.status);
    const subData = await subRes.json();
    const subs    = subData.data || [];

    let premiumMonthly = 0;
    let premiumYearly  = 0;
    let mrr            = 0;

    subs.forEach(sub => {
      const price    = sub.items?.data?.[0]?.price;
      const interval = price?.recurring?.interval;
      const amount   = (price?.unit_amount || 0) / 100;

      if (interval === "month") {
        premiumMonthly++;
        mrr += amount;
      } else if (interval === "year") {
        premiumYearly++;
        mrr += amount / 12;
      }
    });

    const totalPremium = premiumMonthly + premiumYearly;
    mrr = Math.round(mrr * 100) / 100;

    // ── 2. Revenus des 6 derniers mois ────────────────────────────────────
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d      = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const start  = Math.floor(d.getTime() / 1000);
      const end    = Math.floor(new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() / 1000);

      const chargeRes = await fetch(
        `https://api.stripe.com/v1/charges?created[gte]=${start}&created[lte]=${end}&limit=100`,
        { headers: { "Authorization": `Bearer ${stripeKey}` } }
      );
      const chargeData = await chargeRes.json();
      const charges    = chargeData.data || [];
      const total      = charges
        .filter(c => c.paid && !c.refunded)
        .reduce((sum, c) => sum + c.amount, 0) / 100;

      months.push({
        label:   d.toLocaleDateString("fr-FR", { month:"short", year:"2-digit" }),
        revenue: Math.round(total * 100) / 100
      });
    }

    // ── 3. Revenus des 8 dernières semaines ───────────────────────────────
    const now   = Math.floor(Date.now() / 1000);
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const start = now - (i + 1) * 7 * 24 * 3600;
      const end   = now - i       * 7 * 24 * 3600;

      const wRes  = await fetch(
        `https://api.stripe.com/v1/charges?created[gte]=${start}&created[lte]=${end}&limit=100`,
        { headers: { "Authorization": `Bearer ${stripeKey}` } }
      );
      const wData  = await wRes.json();
      const wTotal = (wData.data || [])
        .filter(c => c.paid && !c.refunded)
        .reduce((sum, c) => sum + c.amount, 0) / 100;

      weeks.push({
        label:   i === 0 ? "Cette sem." : `S-${i}`,
        revenue: Math.round(wTotal * 100) / 100
      });
    }

    // ── 4. Balance Stripe ─────────────────────────────────────────────────
    const balRes  = await fetch("https://api.stripe.com/v1/balance", {
      headers: { "Authorization": `Bearer ${stripeKey}` }
    });
    const balData   = await balRes.json();
    const available = (balData.available?.[0]?.amount || 0) / 100;
    const pending   = (balData.pending?.[0]?.amount   || 0) / 100;

    res.json({
      success: true,
      premiumMonthly,
      premiumYearly,
      totalPremium,
      mrr,
      arr: Math.round(mrr * 12 * 100) / 100,
      months,
      weeks,
      balance: { available, pending }
    });

  } catch (e) {
    console.error("stats-revenue:", e.message);
    res.status(500).json({ error: e.message });
  }
}

// ── Stats utilisateurs (Clerk + sources UTM Supabase) ─────────────────────────
async function handleUsers(req, res) {
  try {
    // ✅ Pagination explicite + parsing format multi-version Clerk
    const allUsersRaw = await fetchAllClerkUsers();

    // Exclure les comptes admin de TOUTES les stats (règle "admins exclus de tout")
    const allUsers = allUsersRaw.filter(u => {
      const primary = u.email_addresses?.find(e => e.id === u.primary_email_address_id)?.email_address
        || u.email_addresses?.[0]?.email_address || "";
      return !ADMIN_EMAILS.includes(primary.toLowerCase());
    });

    const now    = Date.now();
    const day7   = now - 7  * 24 * 60 * 60 * 1000;
    const day30  = now - 30 * 24 * 60 * 60 * 1000;

    const total       = allUsers.length;
    const newLast7    = allUsers.filter(u => u.created_at > day7).length;
    const newLast30   = allUsers.filter(u => u.created_at > day30).length;
    const startYear   = new Date(new Date().getFullYear(), 0, 1).getTime();
    const newThisYear = allUsers.filter(u => u.created_at >= startYear).length;
    const activeL30  = allUsers.filter(u => u.last_active_at && u.last_active_at > day30).length;
    // Actifs aujourd'hui = last_active_at dans les dernières 24h
    const day1       = now - 24 * 60 * 60 * 1000;
    const activeToday = allUsers.filter(u => u.last_active_at && u.last_active_at > day1).length;

    // Grouper par semaine (8 dernières semaines)
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const start = now - (i + 1) * 7 * 24 * 60 * 60 * 1000;
      const end   = now - i       * 7 * 24 * 60 * 60 * 1000;
      const count = allUsers.filter(u => u.created_at >= start && u.created_at < end).length;
      weeks.push({ label: `S-${i === 0 ? "cette sem." : i}`, count });
    }

    // Grouper par mois (6 derniers mois)
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d     = new Date();
      d.setMonth(d.getMonth() - i);
      const year  = d.getFullYear();
      const month = d.getMonth();
      const count = allUsers.filter(u => {
        const ud = new Date(u.created_at);
        return ud.getFullYear() === year && ud.getMonth() === month;
      }).length;
      months.push({
        label: d.toLocaleDateString("fr-FR", { month:"short", year:"2-digit" }),
        count
      });
    }

    // Nouveaux inscrits par JOUR (30 derniers jours) — exact, depuis created_at Clerk
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const start = d.getTime();
      const end   = start + 24 * 60 * 60 * 1000;
      const count = allUsers.filter(u => u.created_at >= start && u.created_at < end).length;
      days.push({ label: d.toLocaleDateString("fr-FR", { day:"2-digit", month:"2-digit" }), count });
    }

    // Nouveaux inscrits aujourd'hui (jour calendaire)
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const newToday   = allUsers.filter(u => u.created_at >= startToday.getTime()).length;

    // ✅ Sources UTM séparées : Clerk (inscrits convertis) vs Waitlist (prospects pré-inscrits)
    const clerkSources    = aggregateClerkSources(allUsers);
    const waitlistSources = await aggregateWaitlistSources();

    // Actifs/jour (table daily_active_users via vue) + total waitlist (entonnoir)
    const dauByDay      = await fetchDauByDay();
    const waitlistTotal = await getWaitlistTotal();
    const geo           = await fetchGeoPoints();
    const siteVisits    = await fetchSiteVisits();
    const funnel        = await fetchFunnel();

    res.json({
      success: true,
      total,
      newToday,
      newLast7,
      newLast30,
      newThisYear,
      activeL30,
      activeToday,
      days,
      weeks,
      months,
      dauByDay,
      waitlistTotal,
      geo,
      siteVisits,
      funnel,
      // Backward compat avec l'ancien champ "sources"
      sources: clerkSources,
      // Nouveaux champs explicites pour Pilotage
      clerkSources,
      waitlistSources,
    });

  } catch (e) {
    console.error("stats-users:", e.message);
    res.status(500).json({ error: e.message });
  }
}

// ── Helper : pagination Clerk complète ─────────────────────────────────────
async function fetchAllClerkUsers() {
  const clerkKey = process.env.CLERK_SECRET_KEY;
  const limit    = 100;
  let   offset   = 0;
  const all      = [];

  for (let page = 0; page < 50; page++) {
    const res = await fetch(
      `https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}&order_by=-created_at`,
      { headers: { "Authorization": `Bearer ${clerkKey}`, "Content-Type": "application/json" } }
    );

    if (!res.ok) throw new Error(`Clerk API error: ${res.status}`);
    const json = await res.json();

    // ✅ Gère les 2 formats possibles de l'API Clerk
    const batch = Array.isArray(json) ? json : (json.data || []);

    if (batch.length === 0) break;
    all.push(...batch);

    if (batch.length < limit) break;
    offset += limit;
  }

  return all;
}

// ── Helper : agrégation sources inscrits Clerk (unsafe_metadata) ───────────
// Lit user.unsafe_metadata.source qui est posé par useUTMInjection au signup
function aggregateClerkSources(clerkUsers) {
  const counts = {
    direct: 0, instagram: 0, tiktok: 0, facebook: 0,
    twitter: 0, youtube: 0, google: 0, email: 0,
    linkedin: 0, autre: 0,
  };

  clerkUsers.forEach(u => {
    const src = (u.unsafe_metadata?.source || u.public_metadata?.source || "direct").toLowerCase();
    if (counts[src] !== undefined) counts[src]++;
    else counts.autre++;
  });

  return counts;
}

// ── Helper : agrégation sources pré-inscrits (table preinscriptions Supabase) ──
// Lit la vue preinscriptions_by_source créée dans migration_bloc1.sql
async function aggregateWaitlistSources() {
  const counts = {
    direct: 0, instagram: 0, tiktok: 0, facebook: 0,
    twitter: 0, youtube: 0, google: 0, email: 0,
    linkedin: 0, autre: 0,
  };

  try {
    const supaUrl = process.env.SUPABASE_URL;
    const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supaUrl || !supaKey) {
      console.warn("stats-users: Supabase env vars manquantes pour waitlistSources");
      return counts;
    }

    const r = await fetch(`${supaUrl}/rest/v1/preinscriptions_by_source`, {
      headers: {
        "apikey":        supaKey,
        "Authorization": `Bearer ${supaKey}`,
      }
    });

    if (!r.ok) {
      console.warn("stats-users waitlistSources HTTP:", r.status);
      return counts;
    }

    const rows = await r.json();
    rows.forEach(row => {
      const src = (row.source || "direct").toLowerCase();
      const cnt = parseInt(row.count) || 0;
      if (counts[src] !== undefined) counts[src] += cnt;
      else counts.autre += cnt;
    });
  } catch (e) {
    console.warn("stats-users waitlistSources:", e.message);
  }

  return counts;
}
// ── Helper : actifs/jour depuis la vue dau_by_day (service_role) ──────────────
// Renvoie [{ label:"JJ/MM", count }] sur les 30 derniers jours.
async function fetchDauByDay() {
  try {
    const supaUrl = process.env.SUPABASE_URL;
    const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supaUrl || !supaKey) {
      console.warn("stats-users: env vars manquantes pour dauByDay");
      return [];
    }

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const r = await fetch(
      `${supaUrl}/rest/v1/dau_by_day?day=gte.${since}&order=day.asc`,
      { headers: { "apikey": supaKey, "Authorization": `Bearer ${supaKey}` } }
    );

    if (!r.ok) {
      console.warn("stats-users dauByDay HTTP:", r.status);
      return [];
    }

    const rows = await r.json();
    return rows.map(row => ({
      label: new Date(row.day).toLocaleDateString("fr-FR", { day:"2-digit", month:"2-digit" }),
      count: parseInt(row.count) || 0,
    }));
  } catch (e) {
    console.warn("stats-users dauByDay:", e.message);
    return [];
  }
}

// ── Helper : total préinscrits (hors admins) pour l'entonnoir ────────────────
async function getWaitlistTotal() {
  try {
    const supaUrl = process.env.SUPABASE_URL;
    const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supaUrl || !supaKey) return 0;

    const admins = ["mongazon360@gmail.com", "jordankrebs1@gmail.com"];
    const filter = encodeURIComponent(`not.in.(${admins.join(",")})`);
    const r = await fetch(
      `${supaUrl}/rest/v1/preinscriptions?select=email&email=${filter}`,
      {
        headers: {
          "apikey":        supaKey,
          "Authorization": `Bearer ${supaKey}`,
          "Prefer":        "count=exact",
          "Range":         "0-0",
        }
      }
    );

    const cr    = r.headers.get("content-range") || "";
    const total = parseInt(cr.split("/")[1] || "0", 10);
    return isNaN(total) ? 0 : total;
  } catch (e) {
    console.warn("stats-users waitlistTotal:", e.message);
    return 0;
  }
}

// ── Helper : points géographiques des inscrits (profiles.lat/lon agrégés) ─────
// Regroupe par coordonnées arrondies (≈ même ville) avec un compteur.
async function fetchGeoPoints() {
  try {
    if (!SB_URL || !SB_KEY) return [];
    const r = await fetch(`${SB_URL}/rest/v1/profiles?select=data`, {
      headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` }
    });
    if (!r.ok) return [];
    const rows = await r.json();
    const map  = new Map();
    (rows || []).forEach(row => {
      const d   = row.data || {};
      const lat = parseFloat(d.lat), lon = parseFloat(d.lon);
      if (!isFinite(lat) || !isFinite(lon)) return;
      const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
      const cur = map.get(key);
      if (cur) { cur.count++; }
      else map.set(key, { ville: String(d.ville || "").split(",")[0].trim(), lat: +lat.toFixed(3), lon: +lon.toFixed(3), count: 1 });
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  } catch (e) {
    console.warn("stats-users geo:", e.message);
    return [];
  }
}

// ── Helper : entonnoir de conversion (table funnel_events, 30 jours) ──────────
// Étapes : landing_view → cta_click → auth_screen_view → signup_completed.
// Renvoie les compteurs + taux de passage entre chaque étape.
async function fetchFunnel() {
  const empty = {
    landing_view: 0, cta_click: 0, auth_screen_view: 0, signup_completed: 0,
    rateClick: null, rateAuth: null, rateSignup: null, rateGlobal: null,
    hasData: false,
  };
  try {
    if (!SB_URL || !SB_KEY) return empty;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const r = await fetch(
      `${SB_URL}/rest/v1/funnel_events_by_day?day=gte.${since}`,
      { headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` } }
    );
    if (!r.ok) return empty;
    const rows = await r.json();
    const c = { landing_view: 0, cta_click: 0, auth_screen_view: 0, signup_completed: 0 };
    (rows || []).forEach(x => { if (c[x.step] !== undefined) c[x.step] += parseInt(x.count) || 0; });
    const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
    return {
      ...c,
      rateClick:  pct(c.cta_click,        c.landing_view),     // landing → clic
      rateAuth:   pct(c.auth_screen_view, c.cta_click),        // clic → écran compte
      rateSignup: pct(c.signup_completed, c.auth_screen_view), // écran compte → inscrit
      rateGlobal: pct(c.signup_completed, c.landing_view),     // visite → inscrit (global)
      hasData: (rows || []).length > 0,
    };
  } catch (e) {
    console.warn("stats-users funnel:", e.message);
    return empty;
  }
}

// ── Helper : visites du site (table site_visits, 1 par visiteur/jour) ─────────
// Renvoie { byDay:[{label,count}], today, total30 } sur 30 jours.
async function fetchSiteVisits() {
  const empty = { byDay: [], today: 0, total30: 0 };
  try {
    if (!SB_URL || !SB_KEY) return empty;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const r = await fetch(
      `${SB_URL}/rest/v1/site_visits_by_day?day=gte.${since}&order=day.asc`,
      { headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` } }
    );
    if (!r.ok) return empty;
    const rows     = await r.json();
    const todayStr = new Date().toLocaleDateString("fr-CA");
    const byDay    = (rows || []).map(x => ({
      label: new Date(x.day).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      count: parseInt(x.count) || 0,
    }));
    const today   = parseInt((rows || []).find(x => x.day === todayStr)?.count) || 0;
    const total30 = byDay.reduce((s, d) => s + d.count, 0);
    return { byDay, today, total30 };
  } catch (e) {
    console.warn("stats-users siteVisits:", e.message);
    return empty;
  }
}
