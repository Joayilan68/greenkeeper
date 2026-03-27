// api/send-alert.js
// Envoie une alerte email immédiate via Resend quand un bug est détecté

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { type, message, details = {}, severity = "error" } = req.body;
    if (!type || !message) throw new Error("type et message requis");

    const severityEmoji = { error: "🔴", warning: "🟠", info: "🔵" }[severity] || "🔴";
    const severityLabel = { error: "ERREUR CRITIQUE", warning: "AVERTISSEMENT", info: "INFO" }[severity] || "ERREUR";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;background:#0d2b1a;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#1a4731;border-radius:16px;overflow:hidden;">

    <div style="background:#0d2b1a;padding:20px 24px;border-bottom:2px solid #2d7d52;">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:32px;">🌿</span>
        <div>
          <div style="color:#a5d6a7;font-size:18px;font-weight:800;">Mon Gazon 360</div>
          <div style="color:#81c784;font-size:12px;">Alerte automatique — Système de pilotage</div>
        </div>
      </div>
    </div>

    <div style="padding:24px;">
      <div style="background:${severity==='error'?'rgba(198,40,40,0.3)':severity==='warning'?'rgba(230,81,0,0.3)':'rgba(21,101,192,0.3)'};border:1px solid ${severity==='error'?'#c62828':severity==='warning'?'#e65100':'#1565c0'};border-radius:12px;padding:16px;margin-bottom:20px;">
        <div style="font-size:24px;margin-bottom:8px;">${severityEmoji}</div>
        <div style="color:#fff;font-size:16px;font-weight:800;margin-bottom:4px;">${severityLabel}</div>
        <div style="color:#ef9a9a;font-size:13px;">${type}</div>
      </div>

      <div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:16px;margin-bottom:20px;">
        <div style="color:#a5d6a7;font-size:13px;font-weight:700;margin-bottom:8px;">Message</div>
        <div style="color:#e8f5e9;font-size:14px;line-height:1.6;">${message}</div>
      </div>

      ${Object.keys(details).length > 0 ? `
      <div style="background:rgba(0,0,0,0.2);border-radius:10px;padding:16px;margin-bottom:20px;">
        <div style="color:#a5d6a7;font-size:13px;font-weight:700;margin-bottom:8px;">Détails techniques</div>
        ${Object.entries(details).map(([k, v]) => `
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <span style="color:#81c784;font-size:12px;">${k}</span>
            <span style="color:#e8f5e9;font-size:12px;font-weight:600;">${v}</span>
          </div>
        `).join('')}
      </div>` : ''}

      <div style="background:rgba(0,0,0,0.2);border-radius:10px;padding:12px 16px;">
        <div style="color:#81c784;font-size:11px;">
          ⏰ Détecté le ${new Date().toLocaleString('fr-FR', {timeZone:'Europe/Paris'})}
          <br/>🌐 URL : greenkeeper-five.vercel.app
          <br/>📱 Système de monitoring automatique MG360
        </div>
      </div>
    </div>

    <div style="background:#0d2b1a;padding:16px 24px;text-align:center;border-top:1px solid #2d7d52;">
      <div style="color:#4a7c5c;font-size:11px;">Mon Gazon 360 — Système d'alerte automatique</div>
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
        from:    "Mon Gazon 360 <pilotage@mongazon360.fr>",
        to:      ["jordankrebs1@gmail.com"],
        subject: `${severityEmoji} [MG360] ${severityLabel} — ${type}`,
        html
      })
    });

    const emailData = await emailRes.json();
    if (emailData.error) throw new Error("Resend: " + emailData.error.message);

    res.json({ success: true, emailId: emailData.id });

  } catch (e) {
    console.error("send-alert:", e.message);
    res.status(500).json({ error: e.message });
  }
};
