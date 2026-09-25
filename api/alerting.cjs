// api/alerting.cjs
// Monitoring Mongazon360 — enregistrement des erreurs (table error_events) + alerte email admin.
// Utilisé par send.js (?type=alert : erreurs remontées par l'app) et par les fonctions serveur
// (reportServerError). Dédoublonnage côté serveur : 1 email par problème (empreinte) toutes les
// 6 h, 20 emails/heure maximum, et plus aucun stockage au-delà de 300 événements/heure (anti-flood).

const crypto = require("crypto");

const ALERT_TO         = "mongazon360@gmail.com";
const EMAIL_DEDUP_H    = 6;
const EMAILS_PER_HOUR  = 20;
const EVENTS_PER_HOUR  = 300;

function supabase() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

const clip = (v, n) => (v == null ? null : String(v).slice(0, n));

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => (
  { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]
));

// Empreinte d'un problème : même type + même message « normalisé » (sans nombres, ids, URLs)
function fingerprint(kind, message) {
  const norm = String(message || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "<url>")
    .replace(/[0-9a-f]{8,}/g, "<id>")
    .replace(/\d+/g, "<n>")
    .slice(0, 300);
  return crypto.createHash("sha1").update(`${kind}|${norm}`).digest("hex").slice(0, 16);
}

function buildAlertHtml({ kind, message, severity, source, details, count }) {
  const emoji = { error:"🔴", warning:"🟠", info:"🔵" }[severity] || "🔴";
  const label = { error:"ERREUR", warning:"AVERTISSEMENT", info:"INFO" }[severity] || "ERREUR";
  const color = { error:"#c62828", warning:"#e65100", info:"#1565c0" }[severity] || "#c62828";
  const rows  = Object.entries(details || {}).map(([k, v]) => `
        <div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <span style="color:#81c784;font-size:12px;">${esc(k)}</span>
          <div style="color:#e8f5e9;font-size:12px;font-weight:600;word-break:break-all;">${esc(typeof v === "object" ? JSON.stringify(v) : v)}</div>
        </div>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;background:#0d2b1a;margin:0;padding:24px;">
<div style="max-width:600px;margin:0 auto;background:#1a4731;border-radius:16px;overflow:hidden;">
  <div style="background:#0d2b1a;padding:20px 24px;border-bottom:2px solid #2d7d52;">
    <div style="color:#a5d6a7;font-size:18px;font-weight:800;">🌿 Mongazon360<sup style="font-size:10px;">®</sup></div>
    <div style="color:#81c784;font-size:12px;">Alerte automatique — ${source === "server" ? "serveur" : "application"}</div>
  </div>
  <div style="padding:24px;">
    <div style="border:1px solid ${color};border-radius:12px;padding:16px;margin-bottom:20px;">
      <div style="color:#fff;font-size:16px;font-weight:800;">${emoji} ${label}</div>
      <div style="color:#ef9a9a;font-size:13px;margin-top:4px;">${esc(kind)}</div>
    </div>
    <div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:16px;margin-bottom:20px;">
      <div style="color:#a5d6a7;font-size:13px;font-weight:700;margin-bottom:8px;">Message</div>
      <div style="color:#e8f5e9;font-size:14px;line-height:1.6;word-break:break-word;">${esc(message)}</div>
      ${count > 1 ? `<div style="color:#ffcc80;font-size:12px;margin-top:8px;">↻ ${count} occurrence(s) de ce problème sur les ${EMAIL_DEDUP_H} dernières heures</div>` : ""}
    </div>
    ${rows ? `<div style="background:rgba(0,0,0,0.2);border-radius:10px;padding:16px;margin-bottom:20px;">
      <div style="color:#a5d6a7;font-size:13px;font-weight:700;margin-bottom:8px;">Détails techniques</div>${rows}
    </div>` : ""}
    <div style="color:#81c784;font-size:11px;">⏰ ${new Date().toLocaleString("fr-FR", { timeZone:"Europe/Paris" })} — détail et historique : Pilotage → Bugs</div>
  </div>
</div></body></html>`;
}

async function sendAlertEmail(event, count = 1) {
  const emoji = { error:"🔴", warning:"🟠", info:"🔵" }[event.severity] || "🔴";
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from:    "Mongazon360 Pilotage <bonjour@mongazon360.fr>",
      to:      [ALERT_TO],
      subject: `${emoji} [MG360] ${event.kind}`.slice(0, 150),
      html:    buildAlertHtml({ ...event, count }),
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) throw new Error("Resend : " + (data.error?.message || r.status));
  return data.id;
}

// Enregistre un événement et envoie l'email si nécessaire. Ne lève jamais d'exception.
async function recordError(input, { forceEmail = false } = {}) {
  const event = {
    source:     input.source === "server" ? "server" : "client",
    severity:   ["error", "warning", "info"].includes(input.severity) ? input.severity : "error",
    kind:       clip(input.kind || "Erreur", 120),
    message:    clip(input.message || "(sans message)", 1000),
    path:       clip(input.path, 300),
    user_id:    clip(input.userId, 80),
    user_agent: clip(input.userAgent, 400),
    details:    input.details && typeof input.details === "object"
                  ? Object.fromEntries(Object.entries(input.details).slice(0, 20).map(([k, v]) =>
                      [clip(k, 60), clip(typeof v === "object" ? JSON.stringify(v) : v, 800)]))
                  : null,
  };
  event.fingerprint = fingerprint(event.kind, event.message);

  try {
    const sb   = supabase();
    const hour = new Date(Date.now() - 3600e3).toISOString();

    const { count: lastHour } = await sb.from("error_events")
      .select("id", { count: "exact", head: true }).gte("created_at", hour);
    if ((lastHour || 0) >= EVENTS_PER_HOUR && !forceEmail) return { stored: false, emailed: false };

    const { data: row, error: insErr } = await sb.from("error_events").insert(event).select("id").single();
    if (insErr) throw new Error("Supabase : " + insErr.message);

    let shouldEmail = forceEmail;
    let count = 1;
    if (!shouldEmail && event.severity !== "info") {
      const since = new Date(Date.now() - EMAIL_DEDUP_H * 3600e3).toISOString();
      const [{ count: alreadyEmailed }, { count: emailsLastHour }, { count: occurrences }] = await Promise.all([
        sb.from("error_events").select("id", { count: "exact", head: true })
          .eq("fingerprint", event.fingerprint).eq("emailed", true).gte("created_at", since),
        sb.from("error_events").select("id", { count: "exact", head: true })
          .eq("emailed", true).gte("created_at", hour),
        sb.from("error_events").select("id", { count: "exact", head: true })
          .eq("fingerprint", event.fingerprint).gte("created_at", since),
      ]);
      shouldEmail = !alreadyEmailed && (emailsLastHour || 0) < EMAILS_PER_HOUR;
      count = occurrences || 1;
    }

    if (shouldEmail) {
      await sendAlertEmail(event, count);
      await sb.from("error_events").update({ emailed: true }).eq("id", row.id);
    }
    return { stored: true, emailed: shouldEmail };
  } catch (e) {
    console.error("[alerting]", e.message);
    // Dernier recours : si la base est inaccessible, tenter quand même l'email
    try { await sendAlertEmail(event); return { stored: false, emailed: true }; }
    catch (e2) { console.error("[alerting] email:", e2.message); return { stored: false, emailed: false }; }
  }
}

// Erreur côté serveur (fonctions api/*) — à appeler dans les catch critiques.
async function reportServerError(kind, err, details = {}) {
  console.error(`[${kind}]`, err?.message || err);
  return recordError({
    source: "server",
    severity: "error",
    kind,
    message: err?.message || String(err),
    details: { ...details, ...(err?.stack ? { Stack: String(err.stack).slice(0, 800) } : {}) },
  });
}

// Signal de vie (tâches planifiées…) : table system_status
async function setStatus(key, value) {
  try {
    await supabase().from("system_status")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  } catch (e) { console.error("[alerting] status:", e.message); }
}

async function getStatus(key) {
  try {
    const { data } = await supabase().from("system_status").select("value, updated_at").eq("key", key).maybeSingle();
    return data || null;
  } catch { return null; }
}

module.exports = { recordError, reportServerError, setStatus, getStatus, fingerprint };
