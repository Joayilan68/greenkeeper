// api/stats-users.js
// Récupère les stats utilisateurs depuis Clerk

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  try {
    // Récupérer tous les utilisateurs Clerk
    const clerkRes = await fetch("https://api.clerk.com/v1/users?limit=500&order_by=-created_at", {
      headers: {
        "Authorization": `Bearer ${process.env.CLERK_SECRET_KEY}`,
        "Content-Type":  "application/json"
      }
    });

    if (!clerkRes.ok) throw new Error("Clerk API error: " + clerkRes.status);
    const users = await clerkRes.json();

    const now     = Date.now();
    const day7    = now - 7  * 24 * 60 * 60 * 1000;
    const day30   = now - 30 * 24 * 60 * 60 * 1000;

    const total      = users.length;
    const newLast7   = users.filter(u => u.created_at > day7).length;
    const newLast30  = users.filter(u => u.created_at > day30).length;
    const activeL30  = users.filter(u => u.last_active_at && u.last_active_at > day30).length;

    // Grouper par semaine (8 dernières semaines)
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const start = now - (i + 1) * 7 * 24 * 60 * 60 * 1000;
      const end   = now - i       * 7 * 24 * 60 * 60 * 1000;
      const count = users.filter(u => u.created_at >= start && u.created_at < end).length;
      const label = `S-${i === 0 ? "cette sem." : i}`;
      weeks.push({ label, count });
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

    res.json({ success:true, total, newLast7, newLast30, activeL30, weeks, months });

  } catch (e) {
    console.error("stats-users:", e.message);
    res.status(500).json({ error: e.message });
  }
};
