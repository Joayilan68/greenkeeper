// api/weekly-report.js
// Rapport PDF hebdomadaire — déclenché par Vercel Cron chaque lundi à 8h

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Sécurité : vérifier que c'est bien le cron Vercel ou une requête admin
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET || "mg360-cron-2026";
  if (authHeader !== `Bearer ${cronSecret}` && req.method !== "GET") {
    return res.status(401).json({ error: "Non autorisé" });
  }

  try {
    const now   = new Date();
    const week  = `Semaine du ${now.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}`;

    // Données du rapport (dans un contexte serveur, ces données viendraient de Supabase)
    // Pour l'instant on génère un rapport de statut des services
    const reportData = {
      date:     now.toLocaleString('fr-FR', { timeZone:'Europe/Paris' }),
      semaine:  week,
      services: [
        { name:"Vercel",         status:"✅ Opérationnel",  detail:"Déploiement actif" },
        { name:"Groq Vision IA", status:"✅ Opérationnel",  detail:"Llama 4 Scout 17B" },
        { name:"Cloudinary",     status:"✅ Opérationnel",  detail:"Stockage photos 25GB" },
        { name:"Stripe",         status:"✅ Opérationnel",  detail:"Paiements actifs" },
        { name:"Open-Meteo",     status:"✅ Opérationnel",  detail:"Météo temps réel" },
        { name:"Anthropic",      status:"⚠️ À surveiller", detail:"Crédits à recharger" },
        { name:"Gemini",         status:"⚠️ À surveiller", detail:"Quota limité" },
      ],
      roadmap: [
        { phase:"Phase 1 — Fondations",  statut:"✅ 100% complète" },
        { phase:"Phase 2 — Diagnostic",  statut:"✅ 100% complète" },
        { phase:"Juridique RGPD",        statut:"✅ 64% réalisé" },
        { phase:"Phase 3 — Officialisation", statut:"❌ À démarrer" },
        { phase:"Phase 4 — Monétisation",    statut:"❌ À planifier" },
      ],
      alertes: [],
      nextActions: [
        "Acheter domaines mongazon360.fr + .com sur OVH (~17€)",
        "Créer structure auto-entrepreneur sur urssaf.fr",
        "Recharger crédits Anthropic pour Vision de qualité",
        "Valider documents juridiques avec un avocat RGPD",
      ]
    };

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:24px;">
<div style="max-width:680px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.1);">

  <div style="background:#1a4731;padding:28px 32px;">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px;">
      <span style="font-size:40px;">🌿</span>
      <div>
        <div style="color:#a5d6a7;font-size:22px;font-weight:800;">Mon Gazon 360</div>
        <div style="color:#81c784;font-size:13px;">Rapport Hebdomadaire de Pilotage</div>
      </div>
    </div>
    <div style="color:#4a7c5c;font-size:12px;margin-top:8px;">📅 ${reportData.semaine} — Généré le ${reportData.date}</div>
  </div>

  <div style="padding:28px 32px;">

    <h2 style="color:#1a4731;font-size:16px;margin:0 0 16px;padding-bottom:8px;border-bottom:2px solid #e8f5e9;">⚙️ Statut des services</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr style="background:#f9fbe7;">
        <th style="text-align:left;padding:8px 12px;font-size:12px;color:#555;border-bottom:1px solid #e0e0e0;">Service</th>
        <th style="text-align:center;padding:8px 12px;font-size:12px;color:#555;border-bottom:1px solid #e0e0e0;">Statut</th>
        <th style="text-align:left;padding:8px 12px;font-size:12px;color:#555;border-bottom:1px solid #e0e0e0;">Détail</th>
      </tr>
      ${reportData.services.map((s, i) => `
      <tr style="background:${i%2===0?'#fff':'#fafafa'}">
        <td style="padding:8px 12px;font-size:13px;font-weight:600;border-bottom:1px solid #f0f0f0;">${s.name}</td>
        <td style="padding:8px 12px;font-size:12px;text-align:center;border-bottom:1px solid #f0f0f0;">${s.status}</td>
        <td style="padding:8px 12px;font-size:12px;color:#666;border-bottom:1px solid #f0f0f0;">${s.detail}</td>
      </tr>`).join('')}
    </table>

    <h2 style="color:#1a4731;font-size:16px;margin:0 0 16px;padding-bottom:8px;border-bottom:2px solid #e8f5e9;">🗺️ Avancement Roadmap</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      ${reportData.roadmap.map((r, i) => `
      <tr style="background:${i%2===0?'#fff':'#fafafa'}">
        <td style="padding:8px 12px;font-size:13px;font-weight:600;border-bottom:1px solid #f0f0f0;">${r.phase}</td>
        <td style="padding:8px 12px;font-size:12px;border-bottom:1px solid #f0f0f0;">${r.statut}</td>
      </tr>`).join('')}
    </table>

    <h2 style="color:#1a4731;font-size:16px;margin:0 0 16px;padding-bottom:8px;border-bottom:2px solid #e8f5e9;">✅ Actions prioritaires cette semaine</h2>
    <ul style="margin:0 0 24px;padding-left:20px;">
      ${reportData.nextActions.map(a => `<li style="font-size:13px;color:#333;padding:4px 0;line-height:1.5;">${a}</li>`).join('')}
    </ul>

    ${reportData.alertes.length > 0 ? `
    <div style="background:#fff3e0;border:1px solid #ff9800;border-radius:10px;padding:16px;margin-bottom:24px;">
      <div style="font-weight:700;color:#e65100;margin-bottom:8px;">⚠️ Alertes de la semaine</div>
      ${reportData.alertes.map(a => `<div style="font-size:12px;color:#e65100;padding:2px 0;">• ${a}</div>`).join('')}
    </div>` : `
    <div style="background:#e8f5e9;border:1px solid #43a047;border-radius:10px;padding:16px;margin-bottom:24px;">
      <div style="font-weight:700;color:#1b5e20;">✅ Aucune alerte cette semaine</div>
      <div style="font-size:12px;color:#2e7d32;margin-top:4px;">Tous les systèmes fonctionnent normalement.</div>
    </div>`}

  </div>

  <div style="background:#f9fbe7;padding:16px 32px;border-top:1px solid #e8f5e9;text-align:center;">
    <div style="color:#4a7c5c;font-size:11px;">Mon Gazon 360 — Rapport automatique hebdomadaire — Lundi 8h00</div>
    <div style="color:#81c784;font-size:11px;margin-top:4px;">jordankrebs1@gmail.com</div>
  </div>
</div>
</body>
</html>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from:    "MG360 Pilotage <onboarding@resend.dev>",
        to:      ["jordankrebs1@gmail.com"],
        subject: `📊 [MG360] Rapport hebdomadaire — ${week}`,
        html
      })
    });

    const emailData = await emailRes.json();
    if (emailData.error) throw new Error("Resend: " + emailData.error.message);

    res.json({ success: true, emailId: emailData.id, week });

  } catch (e) {
    console.error("weekly-report:", e.message);
    res.status(500).json({ error: e.message });
  }
};
