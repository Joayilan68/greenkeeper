// api/stats.js
// Fusion de stats-revenue.js et stats-users.js
//
// Usage :
//   GET /api/stats?type=revenue  → stats Stripe (ancien stats-revenue.js)
//   GET /api/stats?type=users    → stats Clerk  (ancien stats-users.js)

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const { type } = req.query;

  if (type === "revenue") return handleRevenue(req, res);
  if (type === "users")   return handleUsers(req, res);

  return res.status(400).json({ error: 'Paramètre ?type=revenue ou ?type=users requis' });
};

// ── Stats financières (Stripe) ────────────────────────────────────────────────
// Code identique à l'ancien stats-revenue.js — aucune modification
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

// ── Stats utilisateurs (Clerk) ────────────────────────────────────────────────
// Code identique à l'ancien stats-users.js — aucune modification
async function handleUsers(req, res) {
  try {
    const clerkRes = await fetch("https://api.clerk.com/v1/users?limit=500&order_by=-created_at", {
      headers: {
        "Authorization": `Bearer ${process.env.CLERK_SECRET_KEY}`,
        "Content-Type":  "application/json"
      }
    });

    if (!clerkRes.ok) throw new Error("Clerk API error: " + clerkRes.status);
    const users = await clerkRes.json();

    const now    = Date.now();
    const day7   = now - 7  * 24 * 60 * 60 * 1000;
    const day30  = now - 30 * 24 * 60 * 60 * 1000;

    const total     = users.length;
    const newLast7  = users.filter(u => u.created_at > day7).length;
    const newLast30 = users.filter(u => u.created_at > day30).length;
    const activeL30 = users.filter(u => u.last_active_at && u.last_active_at > day30).length;

    // Grouper par semaine (8 dernières semaines)
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const start = now - (i + 1) * 7 * 24 * 60 * 60 * 1000;
      const end   = now - i       * 7 * 24 * 60 * 60 * 1000;
      const count = users.filter(u => u.created_at >= start && u.created_at < end).length;
      weeks.push({ label: `S-${i === 0 ? "cette sem." : i}`, count });
    }

    // Grouper par mois (6 derniers mois)
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d     = new Date();
      d.setMonth(d.getMonth() - i);
      const year  = d.getFullYear();
      const month = d.getMonth();
      const count = users.filter(u => {
        const ud = new Date(u.created_at);
        return ud.getFullYear() === year && ud.getMonth() === month;
      }).length;
      months.push({
        label: d.toLocaleDateString("fr-FR", { month:"short", year:"2-digit" }),
        count
      });
    }

    res.json({ success: true, total, newLast7, newLast30, activeL30, weeks, months });

  } catch (e) {
    console.error("stats-users:", e.message);
    res.status(500).json({ error: e.message });
  }
}
