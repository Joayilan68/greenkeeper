// api/send-reminder.js
// Envoie un rappel d'entretien par email via Resend

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { reminders, userEmail, userName = "Jardinier", profile = {}, score = 0 } = req.body;
    if (!reminders?.length || !userEmail) throw new Error("Données manquantes");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.1);">

  <div style="background:#1a4731;padding:24px 28px;">
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:32px;">🌿</span>
      <div>
        <div style="color:#a5d6a7;font-size:18px;font-weight:800;">Mon Gazon 360</div>
        <div style="color:#4a7c5c;font-size:11px;font-style:italic;">Tant qu'il y a gazon, il y a match</div>
      </div>
    </div>
  </div>

  <div style="padding:24px 28px;">
    <div style="font-size:20px;font-weight:800;color:#1a4731;margin-bottom:6px;">
      👋 Bonjour ${userName} !
    </div>
    <div style="font-size:13px;color:#555;margin-bottom:20px;line-height:1.6;">
      Voici vos rappels d'entretien du jour. Votre score actuel est de <strong style="color:#1a4731;">${score}/100</strong>.
      ${profile.pelouse ? `<br/>Gazon : ${profile.pelouse} — Sol : ${profile.sol} — ${profile.surface}m²` : ""}
    </div>

    <div style="margin-bottom:24px;">
      ${reminders.map(r => `
      <div style="display:flex;align-items:flex-start;gap:14px;padding:14px;background:#f9fbe7;border-radius:12px;border-left:4px solid #43a047;margin-bottom:10px;">
        <span style="font-size:28px;line-height:1;">${r.icon}</span>
        <div style="flex:1;">
          <div style="font-size:15px;font-weight:800;color:#1a4731;margin-bottom:4px;">${r.label}</div>
          <div style="font-size:12px;color:#555;line-height:1.5;">${r.desc}</div>
          <div style="font-size:11px;color:#888;margin-top:6px;">📅 Fréquence recommandée : tous les ${r.days} jours</div>
        </div>
      </div>`).join("")}
    </div>

    <div style="text-align:center;margin-bottom:20px;">
      <a href="https://greenkeeper-five.vercel.app/today" style="background:#1a4731;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:800;display:inline-block;">
        🌿 Ouvrir Mon Gazon 360 →
      </a>
    </div>

    <div style="background:#e8f5e9;border-radius:10px;padding:12px 16px;font-size:11px;color:#2e7d32;text-align:center;line-height:1.6;">
      Pour modifier vos rappels : Mon Gazon 360 → Mon Gazon → 🔔 Mes rappels
    </div>
  </div>

  <div style="background:#f9fbe7;padding:14px 28px;border-top:1px solid #e8f5e9;text-align:center;">
    <div style="color:#4a7c5c;font-size:10px;">Mon Gazon 360 — Rappels personnalisés</div>
  </div>
</div>
</body></html>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization":`Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from:    "Mon Gazon 360 <pilotage@mongazon360.fr>",
        to:      [userEmail],
        subject: `🌿 [MG360] Rappel : ${reminders.map(r => r.label).join(", ")}`,
        html
      })
    });

    const data = await emailRes.json();
    if (data.error) throw new Error("Resend: " + data.error.message);

    res.json({ success: true, emailId: data.id });

  } catch (e) {
    console.error("send-reminder:", e.message);
    res.status(500).json({ error: e.message });
  }
};
