// api/weekly-report.js
// Rapport hebdomadaire complet — Clerk + Stripe + Services + Bugs
// Déclenché automatiquement chaque lundi à 8h par Vercel Cron

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET || "mg360-cron-2026";
  if (req.method !== "GET" && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  try {
    const now  = new Date();
    const week = `Semaine du ${now.toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" })}`;
    const date = now.toLocaleString("fr-FR", { timeZone:"Europe/Paris" });

    // ── 1. DONNÉES CLERK ─────────────────────────────────────────────────────
    let users = { total:0, newLast7:0, newLast30:0, activeL30:0 };
    try {
      const clerkRes = await fetch("https://api.clerk.com/v1/users?limit=500&order_by=-created_at", {
        headers: { "Authorization":`Bearer ${process.env.CLERK_SECRET_KEY}` }
      });
      if (clerkRes.ok) {
        const list  = await clerkRes.json();
        const n     = Date.now();
        const d7    = n - 7  * 86400000;
        const d30   = n - 30 * 86400000;
        users = {
          total:     list.length,
          newLast7:  list.filter(u => u.created_at > d7).length,
          newLast30: list.filter(u => u.created_at > d30).length,
          activeL30: list.filter(u => u.last_active_at && u.last_active_at > d30).length,
        };
      }
    } catch (e) { console.warn("Clerk fetch failed:", e.message); }

    // ── 2. DONNÉES STRIPE ────────────────────────────────────────────────────
    let revenue = { mrr:0, arr:0, premiumMonthly:0, premiumYearly:0, totalPremium:0, available:0, pending:0, monthlyRevenues:[] };
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY;

      // Abonnements actifs
      const subRes = await fetch(
        "https://api.stripe.com/v1/subscriptions?status=active&limit=100&expand[]=data.items.data.price",
        { headers: { "Authorization":`Bearer ${stripeKey}` } }
      );
      if (subRes.ok) {
        const subData = await subRes.json();
        let mrr = 0;
        (subData.data || []).forEach(sub => {
          const price    = sub.items?.data?.[0]?.price;
          const interval = price?.recurring?.interval;
          const amount   = (price?.unit_amount || 0) / 100;
          if (interval === "month") { revenue.premiumMonthly++; mrr += amount; }
          else if (interval === "year") { revenue.premiumYearly++; mrr += amount / 12; }
        });
        revenue.mrr          = Math.round(mrr * 100) / 100;
        revenue.arr          = Math.round(mrr * 12 * 100) / 100;
        revenue.totalPremium = revenue.premiumMonthly + revenue.premiumYearly;
      }

      // Revenus 6 derniers mois
      for (let i = 5; i >= 0; i--) {
        const d     = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
        const start = Math.floor(d.getTime() / 1000);
        const end   = Math.floor(new Date(d.getFullYear(), d.getMonth()+1, 1).getTime() / 1000);
        const cRes  = await fetch(`https://api.stripe.com/v1/charges?created[gte]=${start}&created[lte]=${end}&limit=100`, {
          headers: { "Authorization":`Bearer ${stripeKey}` }
        });
        if (cRes.ok) {
          const cData = await cRes.json();
          const total = (cData.data || []).filter(c => c.paid && !c.refunded).reduce((s,c) => s + c.amount, 0) / 100;
          revenue.monthlyRevenues.push({ label: d.toLocaleDateString("fr-FR",{month:"short",year:"2-digit"}), total: Math.round(total*100)/100 });
        }
      }

      // Solde
      const balRes = await fetch("https://api.stripe.com/v1/balance", { headers: { "Authorization":`Bearer ${stripeKey}` } });
      if (balRes.ok) {
        const bal = await balRes.json();
        revenue.available = (bal.available?.[0]?.amount || 0) / 100;
        revenue.pending   = (bal.pending?.[0]?.amount   || 0) / 100;
      }
    } catch (e) { console.warn("Stripe fetch failed:", e.message); }

    // ── 3. SERVICES ───────────────────────────────────────────────────────────
    const services = [
      { name:"Vercel",         status:"✅", detail:"Déployé" },
      { name:"Groq Vision IA", status:"✅", detail:"Llama 4 Scout — Gratuit" },
      { name:"Cloudinary",     status:"✅", detail:"Photos 25GB gratuit" },
      { name:"Stripe",         status:"✅", detail:"Paiements actifs" },
      { name:"Open-Meteo",     status:"✅", detail:"Météo gratuit" },
      { name:"Clerk",          status:"✅", detail:"Auth — Mode test" },
      { name:"Resend",         status:"✅", detail:"Emails actifs" },
      { name:"Anthropic",      status:"⚠️", detail:"Crédits à recharger" },
      { name:"Supabase",       status:"❌", detail:"Phase 3 — Non configuré" },
    ];

    // ── 4. ACTIONS PRIORITAIRES ───────────────────────────────────────────────
    const nextActions = [
      "Acheter domaines mongazon360.fr + .com sur OVH (~17€/an)",
      "Créer structure auto-entrepreneur sur urssaf.fr",
      "Recharger crédits Anthropic pour Vision de qualité",
      "Valider documents juridiques avec un avocat RGPD",
      "Configurer Supabase pour centraliser les données utilisateurs",
    ];

    // ── HTML EMAIL ────────────────────────────────────────────────────────────
    const eur = (n) => (Math.round((n||0)*100)/100).toFixed(2) + "€";

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
<div style="max-width:680px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.1);">

  <!-- HEADER -->
  <div style="background:#1a4731;padding:28px 32px;">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px;">
      <span style="font-size:36px;">🌿</span>
      <div>
        <div style="color:#a5d6a7;font-size:22px;font-weight:800;">Mon Gazon 360</div>
        <div style="color:#81c784;font-size:13px;">Rapport Hebdomadaire Complet</div>
      </div>
    </div>
    <div style="color:#4a7c5c;font-size:12px;margin-top:8px;">📅 ${week} — Généré le ${date}</div>
  </div>

  <div style="padding:28px 32px;">

    <!-- BLOC 1 : ACTIVITÉ UTILISATEURS -->
    <h2 style="color:#1a4731;font-size:17px;margin:0 0 12px;padding-bottom:8px;border-bottom:3px solid #e8f5e9;">👥 Activité Utilisateurs</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:20px;">
      ${[
        ["Total inscrits",  users.total,     "#1a4731"],
        ["Nouveaux 7j",     users.newLast7,  "#1565c0"],
        ["Nouveaux 30j",    users.newLast30, "#6a1b9a"],
        ["Actifs 30j",      users.activeL30, "#2e7d32"],
      ].map(([label, val, bg]) => `
        <div style="background:${bg};border-radius:10px;padding:12px 8px;text-align:center;">
          <div style="color:#fff;font-size:24px;font-weight:800;">${val}</div>
          <div style="color:rgba(255,255,255,0.8);font-size:10px;margin-top:4px;">${label}</div>
        </div>`).join("")}
    </div>

    <!-- BLOC 2 : FINANCES -->
    <h2 style="color:#1a4731;font-size:17px;margin:0 0 12px;padding-bottom:8px;border-bottom:3px solid #fff9e6;">💰 Finances & Revenus</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">
      ${[
        ["MRR",              eur(revenue.mrr),          "#e65100"],
        ["ARR projeté",      eur(revenue.arr),          "#f9a825"],
        ["Solde disponible", eur(revenue.available),    "#1a4731"],
      ].map(([label, val, bg]) => `
        <div style="background:${bg};border-radius:10px;padding:12px 8px;text-align:center;">
          <div style="color:#fff;font-size:18px;font-weight:800;">${val}</div>
          <div style="color:rgba(255,255,255,0.8);font-size:10px;margin-top:4px;">${label}</div>
        </div>`).join("")}
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;">
      <tr style="background:#f9fbe7;">
        <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e0e0e0;color:#555;">Source</th>
        <th style="text-align:center;padding:8px 12px;border-bottom:1px solid #e0e0e0;color:#555;">Abonnés</th>
        <th style="text-align:right;padding:8px 12px;border-bottom:1px solid #e0e0e0;color:#555;">Revenus</th>
      </tr>
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">Mensuel @ 4,99€</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-weight:700;">${revenue.premiumMonthly}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;">${eur(revenue.premiumMonthly * 4.99)}</td>
      </tr>
      <tr style="background:#fafafa;">
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">Annuel @ 39,99€</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-weight:700;">${revenue.premiumYearly}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;">${eur(revenue.premiumYearly * 39.99)}</td>
      </tr>
      <tr style="background:#e8f5e9;">
        <td style="padding:8px 12px;font-weight:800;color:#1a4731;">TOTAL</td>
        <td style="padding:8px 12px;text-align:center;font-weight:800;color:#1a4731;">${revenue.totalPremium}</td>
        <td style="padding:8px 12px;text-align:right;font-weight:800;color:#1a4731;">${eur(revenue.mrr)}/mois</td>
      </tr>
    </table>

    ${revenue.monthlyRevenues.length > 0 ? `
    <div style="margin-bottom:20px;">
      <div style="font-size:13px;font-weight:700;color:#555;margin-bottom:8px;">Revenus 6 derniers mois :</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        ${revenue.monthlyRevenues.map((m, i) => `
        <tr style="background:${i%2===0?'#fff':'#fafafa'}">
          <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;font-weight:600;">${m.label}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;color:#1a4731;">${eur(m.total)}</td>
        </tr>`).join("")}
      </table>
    </div>` : ""}

    <!-- BLOC 3 : SERVICES -->
    <h2 style="color:#1a4731;font-size:17px;margin:0 0 12px;padding-bottom:8px;border-bottom:3px solid #e8f5e9;">⚙️ Statut des Services</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;">
      ${services.map((s, i) => `
      <tr style="background:${i%2===0?'#fff':'#fafafa'}">
        <td style="padding:7px 12px;border-bottom:1px solid #f0f0f0;">${s.status}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;">${s.name}</td>
        <td style="padding:7px 12px;border-bottom:1px solid #f0f0f0;color:#666;">${s.detail}</td>
      </tr>`).join("")}
    </table>

    <!-- BLOC 4 : ROADMAP -->
    <h2 style="color:#1a4731;font-size:17px;margin:0 0 12px;padding-bottom:8px;border-bottom:3px solid #e8f5e9;">🗺️ Avancement Roadmap</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;">
      ${[
        ["Phase 1 — Fondations",     "✅ 100%", "#e8f5e9"],
        ["Phase 2 — Diagnostic IA",  "✅ 100%", "#e8f5e9"],
        ["Juridique RGPD",           "✅ 64%",  "#fce4ec"],
        ["Phase 3 — Officialisation","❌ 0%",   "#ffebee"],
        ["Phase 4 — Monétisation",   "❌ 0%",   "#f3e5f5"],
      ].map(([phase, statut, bg]) => `
      <tr style="background:${bg}">
        <td style="padding:8px 12px;border-bottom:1px solid rgba(0,0,0,0.05);font-weight:600;">${phase}</td>
        <td style="padding:8px 12px;border-bottom:1px solid rgba(0,0,0,0.05);text-align:right;font-weight:700;">${statut}</td>
      </tr>`).join("")}
    </table>

    <!-- BLOC 5 : ACTIONS PRIORITAIRES -->
    <h2 style="color:#1a4731;font-size:17px;margin:0 0 12px;padding-bottom:8px;border-bottom:3px solid #fff9e6;">✅ Actions prioritaires cette semaine</h2>
    <ul style="margin:0 0 24px;padding-left:20px;">
      ${nextActions.map(a => `<li style="font-size:13px;color:#333;padding:4px 0;line-height:1.6;">${a}</li>`).join("")}
    </ul>

  </div>

  <!-- FOOTER -->
  <div style="background:#f9fbe7;padding:16px 32px;border-top:1px solid #e8f5e9;text-align:center;">
    <div style="color:#4a7c5c;font-size:11px;">Mon Gazon 360 — Rapport automatique hebdomadaire — Lundi 8h00</div>
    <div style="color:#81c784;font-size:11px;margin-top:4px;">jordankrebs1@gmail.com</div>
  </div>
</div>
</body></html>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization":`Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from:    "MG360 Pilotage <onboarding@resend.dev>",
        to:      ["jordankrebs1@gmail.com"],
        subject: `📊 [MG360] Rapport hebdomadaire — ${week}`,
        html
      })
    });

    const emailData = await emailRes.json();
    if (emailData.error) throw new Error("Resend: " + emailData.error.message);

    res.json({ success:true, emailId:emailData.id, week, users, revenue });

  } catch (e) {
    console.error("weekly-report:", e.message);
    res.status(500).json({ error: e.message });
  }
};
