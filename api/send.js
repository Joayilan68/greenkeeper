// api/send.js
// POST /api/send?type=alert|notification|reminder|save-sub|save-reminders
// GET  /api/send → cron quotidien 8h00 (Vercel cron)

const REMINDER_LABELS = {
  tonte:     { icon:"✂️", label:"Tonte",               desc:"Fréquence de tonte recommandée" },
  arrosage:  { icon:"💧", label:"Arrosage",             desc:"Rappel d'arrosage régulier" },
  engrais:   { icon:"🌱", label:"Engrais",              desc:"Application d'engrais" },
  fongicide: { icon:"💊", label:"Traitement fongicide", desc:"Prévention maladies fongiques" },
  aeration:  { icon:"🌀", label:"Aération",             desc:"Aération du sol" },
  desherbage:{ icon:"🪴", label:"Désherbage",           desc:"Élimination des mauvaises herbes" },
};

function buildReminderHtml(reminders, userName, profile, score) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.1);">
  <div style="background:#1a4731;padding:24px 28px;">
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:32px;">🌿</span>
      <div>
        <div style="color:#a5d6a7;font-size:18px;font-weight:800;">Mongazon360</div>
        <div style="color:#4a7c5c;font-size:11px;font-style:italic;">Tant qu'il y a gazon, il y a match</div>
      </div>
    </div>
  </div>
  <div style="padding:24px 28px;">
    <div style="font-size:20px;font-weight:800;color:#1a4731;margin-bottom:6px;">👋 Bonjour ${userName} !</div>
    <div style="font-size:13px;color:#555;margin-bottom:20px;line-height:1.6;">
      Voici vos rappels d'entretien du jour. Votre score actuel est de <strong style="color:#1a4731;">${score}/100</strong>.
      ${profile && profile.pelouse ? `<br/>Gazon : ${profile.pelouse} — Sol : ${profile.sol} — ${profile.surface}m²` : ""}
    </div>
    <div style="margin-bottom:24px;">
      ${reminders.map(r => `
      <div style="display:flex;align-items:flex-start;gap:14px;padding:14px;background:#f9fbe7;border-radius:12px;border-left:4px solid #43a047;margin-bottom:10px;">
        <span style="font-size:28px;line-height:1;">${r.icon}</span>
        <div style="flex:1;">
          <div style="font-size:15px;font-weight:800;color:#1a4731;margin-bottom:4px;">${r.label}</div>
          <div style="font-size:12px;color:#555;line-height:1.5;">${r.desc}</div>
          <div style="font-size:11px;color:#888;margin-top:6px;">📅 Fréquence : tous les ${r.days} jours</div>
        </div>
      </div>`).join("")}
    </div>
    <div style="text-align:center;margin-bottom:20px;">
      <a href="https://mongazon360.fr/today" style="background:#1a4731;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:800;display:inline-block;">
        🌿 Ouvrir Mongazon360 →
      </a>
    </div>
  </div>
  <div style="background:#f9fbe7;padding:14px 28px;border-top:1px solid #e8f5e9;text-align:center;">
    <div style="color:#4a7c5c;font-size:10px;">Mongazon360 — Rappels personnalisés</div>
  </div>
</div>
</body></html>`;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── GET = CRON QUOTIDIEN (8h00 via Vercel) ────────────────────────────────
  if (req.method === "GET") {
    try {
      const { createClient } = require("@supabase/supabase-js");
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      const webpush = require("web-push");
      webpush.setVapidDetails(
        process.env.VAPID_EMAIL || "mailto:contact@mongazon360.fr",
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );

      // Récupérer rappels + souscriptions
      const [{ data: remindersData }, { data: subsData }] = await Promise.all([
        supabase.from("reminders").select("*"),
        supabase.from("push_subscriptions").select("*"),
      ]);

      const subMap = {};
      (subsData || []).forEach(s => { subMap[s.user_id] = s.subscription; });

      let pushSent = 0, emailSent = 0;
      const today = new Date().toISOString().slice(0, 10);

      for (const row of (remindersData || [])) {
        const { user_id, email, preferences, consents } = row;
        const prefs = preferences || {};
        const due = [];

        // Calculer rappels dus
        for (const [id, r] of Object.entries(prefs)) {
          if (!r.enabled) continue;
          const lastSent = r.lastSent ? new Date(r.lastSent) : null;
          const daysSince = lastSent
            ? Math.floor((Date.now() - lastSent.getTime()) / 86400000)
            : 999;
          if (daysSince >= (r.days || 7)) {
            const info = REMINDER_LABELS[id] || { icon:"🌿", label:id, desc:"" };
            due.push({ id, ...r, ...info });
          }
        }

        if (!due.length) continue;
        const updatedPrefs = { ...prefs };

        // ── Push ────────────────────────────────────────────────────────────
        const sub = subMap[user_id];
        if (consents?.notifications && sub) {
          for (const r of due.filter(r => r.push)) {
            try {
              await webpush.sendNotification(sub, JSON.stringify({
                title: `🌿 Mongazon360 — ${r.label}`,
                body:  `Il est temps de faire votre ${r.label.toLowerCase()} !`,
                icon:  "/icon-192.png",
                tag:   `reminder-${r.id}`,
                url:   "/today",
                actionRoute: "/today",
              }));
              updatedPrefs[r.id] = { ...updatedPrefs[r.id], lastSent: new Date().toISOString() };
              pushSent++;
            } catch {}
          }
        }

        // ── Email ───────────────────────────────────────────────────────────
        if (consents?.marketing && email) {
          const emailDue = due.filter(r => r.email);
          if (emailDue.length) {
            try {
              const emailRes = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { "Content-Type":"application/json", "Authorization":`Bearer ${process.env.RESEND_API_KEY}` },
                body: JSON.stringify({
                  from:    "Mongazon360 <bonjour@mongazon360.fr>",
                  to:      [email],
                  subject: `🌿 [MG360] Rappel : ${emailDue.map(r => r.label).join(", ")}`,
                  html:    buildReminderHtml(emailDue, "Jardinier", {}, 0),
                }),
              });
              const d = await emailRes.json();
              if (!d.error) {
                emailDue.forEach(r => {
                  updatedPrefs[r.id] = { ...updatedPrefs[r.id], lastSent: new Date().toISOString() };
                });
                emailSent++;
              }
            } catch {}
          }
        }

        // Mettre à jour lastSent dans Supabase
        await supabase.from("reminders")
          .update({ preferences: updatedPrefs, updated_at: new Date().toISOString() })
          .eq("user_id", user_id);
      }

      return res.json({ success: true, date: today, pushSent, emailSent });
    } catch (e) {
      console.error("cron reminders:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method !== "POST") return res.status(405).end();

  const { type } = req.query;

  // ── SAVE-SUB (souscription push → Supabase) ───────────────────────────────
  if (type === "save-sub") {
    try {
      const { subscription, userId } = req.body;
      if (!subscription || !userId) throw new Error("Données manquantes");
      const { createClient } = require("@supabase/supabase-js");
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      await supabase.from("push_subscriptions").upsert(
        { user_id: userId, subscription, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      return res.json({ success: true });
    } catch (e) {
      console.error("save-sub:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  // ── SAVE-REMINDERS (préférences rappels → Supabase) ───────────────────────
  if (type === "save-reminders") {
    try {
      const { userId, email, preferences, consents } = req.body;
      if (!userId) throw new Error("userId manquant");
      const { createClient } = require("@supabase/supabase-js");
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      await supabase.from("reminders").upsert(
        { user_id: userId, email: email || null, preferences, consents, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      return res.json({ success: true });
    } catch (e) {
      console.error("save-reminders:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  const { type } = req.query;

  // ── ALERT ─────────────────────────────────────────────────────────────────
  if (type === "alert") {
    try {
      const { type: alertType, message, details = {}, severity = "error" } = req.body;
      if (!alertType || !message) throw new Error("type et message requis");

      const severityEmoji = { error: "🔴", warning: "🟠", info: "🔵" }[severity] || "🔴";
      const severityLabel = { error: "ERREUR CRITIQUE", warning: "AVERTISSEMENT", info: "INFO" }[severity] || "ERREUR";

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;background:#0d2b1a;margin:0;padding:24px;">
<div style="max-width:600px;margin:0 auto;background:#1a4731;border-radius:16px;overflow:hidden;">
  <div style="background:#0d2b1a;padding:20px 24px;border-bottom:2px solid #2d7d52;">
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:32px;">🌿</span>
      <div>
        <div style="color:#a5d6a7;font-size:18px;font-weight:800;">Mongazon360</div>
        <div style="color:#81c784;font-size:12px;">Alerte automatique — Système de pilotage</div>
      </div>
    </div>
  </div>
  <div style="padding:24px;">
    <div style="background:${severity==="error"?"rgba(198,40,40,0.3)":severity==="warning"?"rgba(230,81,0,0.3)":"rgba(21,101,192,0.3)"};border:1px solid ${severity==="error"?"#c62828":severity==="warning"?"#e65100":"#1565c0"};border-radius:12px;padding:16px;margin-bottom:20px;">
      <div style="font-size:24px;margin-bottom:8px;">${severityEmoji}</div>
      <div style="color:#fff;font-size:16px;font-weight:800;margin-bottom:4px;">${severityLabel}</div>
      <div style="color:#ef9a9a;font-size:13px;">${alertType}</div>
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
        </div>`).join("")}
    </div>` : ""}
    <div style="background:rgba(0,0,0,0.2);border-radius:10px;padding:12px 16px;">
      <div style="color:#81c784;font-size:11px;">
        ⏰ Détecté le ${new Date().toLocaleString("fr-FR", {timeZone:"Europe/Paris"})}<br/>
        🌐 mongazon360.fr<br/>
        📱 Système de monitoring automatique MG360
      </div>
    </div>
  </div>
  <div style="background:#0d2b1a;padding:16px 24px;text-align:center;border-top:1px solid #2d7d52;">
    <div style="color:#4a7c5c;font-size:11px;">Mongazon360 — Système d'alerte automatique</div>
  </div>
</div>
</body></html>`;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from:    "Mongazon360 Pilotage <bonjour@mongazon360.fr>",
          to:      ["mongazon360@gmail.com"],
          subject: `${severityEmoji} [MG360] ${severityLabel} — ${alertType}`,
          html,
        }),
      });

      const emailData = await emailRes.json();
      if (emailData.error) throw new Error("Resend: " + emailData.error.message);
      return res.json({ success: true, emailId: emailData.id });

    } catch (e) {
      console.error("send alert:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  // ── NOTIFICATION (push) ───────────────────────────────────────────────────
  if (type === "notification") {
    try {
      const { subscription, notification } = req.body;
      if (!subscription || !notification) throw new Error("Données manquantes");

      const vapidPublicKey  = process.env.VAPID_PUBLIC_KEY;
      const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
      const vapidEmail      = process.env.VAPID_EMAIL || "mailto:contact@mongazon360.fr";

      if (!vapidPublicKey || !vapidPrivateKey) throw new Error("Clés VAPID manquantes");

      const payload = JSON.stringify({
        title:       notification.title       || "🌿 Mongazon360",
        body:        notification.body        || "Nouvelle alerte pour votre gazon",
        icon:        "/icon-192.png",
        tag:         notification.tag         || "mg360-alert",
        url:         notification.actionRoute || "/",
        actionRoute: notification.actionRoute || "/",
      });

      const webpush = require("web-push");
      webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
      await webpush.sendNotification(subscription, payload);

      return res.json({ success: true });

    } catch (e) {
      console.error("send notification:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  // ── REMINDER (email) ──────────────────────────────────────────────────────
  if (type === "reminder") {
    try {
      const { reminders, userEmail, userName = "Jardinier", profile = {}, score = 0 } = req.body;
      if (!reminders?.length || !userEmail) throw new Error("Données manquantes");

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from:    "Mongazon360 <bonjour@mongazon360.fr>",
          to:      [userEmail],
          subject: `🌿 [MG360] Rappel : ${reminders.map(r => r.label).join(", ")}`,
          html:    buildReminderHtml(reminders, userName, profile, score),
        }),
      });

      const data = await emailRes.json();
      if (data.error) throw new Error("Resend: " + data.error.message);
      return res.json({ success: true, emailId: data.id });

    } catch (e) {
      console.error("send reminder:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: "Type requis : ?type=alert|notification|reminder" });
};
