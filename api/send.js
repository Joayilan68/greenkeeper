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
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.1);">
  <div style="background:#1a4731;padding:24px 28px;">
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:32px;">🌿</span>
      <div>
        <div style="color:#a5d6a7;font-size:18px;font-weight:800;">Mongazon360<sup style="font-size:10px;">™</sup></div>
        <div style="color:#4a7c5c;font-size:11px;font-style:italic;">Tant qu'il y a gazon, il y a match</div>
      </div>
    </div>
  </div>
  <div style="padding:24px 28px;">
    <div style="font-size:20px;font-weight:800;color:#1a4731;margin-bottom:6px;">👋 Bonjour ${userName} !</div>
    <div style="font-size:13px;color:#555;margin-bottom:20px;line-height:1.6;">
      Voici vos rappels d'entretien du jour.
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
    <div style="text-align:center;padding:16px 0 8px;border-top:1px solid #e8f5e9;margin-top:8px;">
      <p style="color:#52b788;font-size:12px;font-weight:600;margin:0 0 4px;">
        L'équipe Mongazon360<sup style="font-size:8px;">™</sup>
      </p>
    </div>
  </div>
  <div style="background:#f9fbe7;padding:14px 28px;border-top:1px solid #e8f5e9;text-align:center;">
    <div style="color:#4a7c5c;font-size:10px;">Mongazon360<sup style="font-size:7px;">™</sup> — Rappels personnalisés</div>
    <div style="color:#81c784;font-size:9px;margin-top:4px;">
      © ${year} Mongazon360<sup style="font-size:7px;">™</sup> — Marque déposée à l'EUIPO ·
      <a href="https://mongazon360.fr/mentions-legales" style="color:#52b788;">Mentions légales</a>
    </div>
  </div>
</div>
</body></html>`;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Secret");
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

      // Récupérer rappels + souscriptions + consentements (source de vérité)
      const [{ data: remindersData }, { data: subsData }, { data: consentsData }] = await Promise.all([
        supabase.from("reminders").select("*"),
        supabase.from("push_subscriptions").select("*"),
        supabase.from("user_consents").select("user_id, notifications, marketing"),
      ]);

      const subMap = {};
      (subsData || []).forEach(s => { subMap[s.user_id] = s.subscription; });

      // Consentements lus depuis user_consents (et NON reminders.consents qui est toujours {})
      const consentMap = {};
      (consentsData || []).forEach(c => { consentMap[c.user_id] = c; });

      // Intervalles agronomiques fixes (KB v4) — alignés sur useReminders.getDueReminders
      const INTERVALLES = { tonte:5, arrosage:3, engrais:45, fongicide:14, aeration:90, desherbage:21 };

      let pushSent = 0, emailSent = 0;
      const today = new Date().toISOString().slice(0, 10);

      for (const row of (remindersData || [])) {
        const { user_id, email, preferences } = row;
        const prefs = preferences || {};
        const userConsents = consentMap[user_id] || {};
        const due = [];

        // Calculer rappels dus (intervalles agronomiques, plus de r.days)
        for (const [id, r] of Object.entries(prefs)) {
          if (!r || typeof r !== "object" || !r.enabled) continue;
          const lastSent = r.lastSent ? new Date(r.lastSent) : null;
          const daysSince = lastSent
            ? Math.floor((Date.now() - lastSent.getTime()) / 86400000)
            : 999;
          if (daysSince >= (INTERVALLES[id] || 7)) {
            const info = REMINDER_LABELS[id] || { icon:"🌿", label:id, desc:"" };
            due.push({ id, ...r, ...info });
          }
        }

        if (!due.length) continue;
        const updatedPrefs = { ...prefs };

        // ── Push : piloté par le SEUL consentement global "notifications" ──────
        const sub = subMap[user_id];
        if (userConsents.notifications && sub) {
          for (const r of due) {
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
        if (userConsents.marketing && email) {
          const emailDue = due.filter(r => r.email);
          if (emailDue.length) {
            try {
              const emailRes = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { "Content-Type":"application/json", "Authorization":`Bearer ${process.env.RESEND_API_KEY}` },
                body: JSON.stringify({
                  from:    "Mongazon360 <bonjour@mongazon360.fr>",
                  to:      [email],
                  subject: `🌿 [Mongazon360™] Rappel : ${emailDue.map(r => r.label).join(", ")}`,
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

      console.log("[CRON] reminders:", remindersData?.length || 0, "subs:", subsData?.length || 0, "pushSent:", pushSent, "emailSent:", emailSent);
      return res.json({ success: true, date: today, pushSent, emailSent, reminders: remindersData?.length || 0, subs: subsData?.length || 0 });
    } catch (e) {
      console.error("cron reminders:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method !== "POST") return res.status(405).end();

  const { type } = req.query;

  // ════════════════════════════════════════════════════════════════════════
  // GUEST-STATUS — l'utilisateur a-t-il un accès invité ? (lecture SERVEUR)
  // POST /api/send?type=guest-status   Bearer Clerk obligatoire
  // Lit user_access en service_role → contourne le RLS (fiable au rechargement).
  // ════════════════════════════════════════════════════════════════════════
  if (type === "guest-status") {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Token manquant", isGuest: false });
      const token = authHeader.replace("Bearer ", "");
      let userId = null;
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
          userId = payload.sub || payload.user_id;
        }
      } catch {}
      if (!userId) return res.status(401).json({ error: "Token invalide", isGuest: false });

      const { createClient } = require("@supabase/supabase-js");
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const { data } = await supabase
        .from("user_access")
        .select("status")
        .eq("user_id", userId)
        .maybeSingle();

      return res.json({ status: data?.status || null, isGuest: data?.status === "guest" });
    } catch (e) {
      console.error("[send] guest-status:", e.message);
      return res.status(500).json({ error: e.message, isGuest: false });
    }
  }


  // ════════════════════════════════════════════════════════════════════════
  // VALIDATE-GUEST — Valide un code invité → user_access.status = "guest"
  // POST /api/send?type=validate-guest   body: { code }   Bearer Clerk obligatoire
  // Tout est serveur (service_role) : le client n'accède jamais à guest_codes.
  // ════════════════════════════════════════════════════════════════════════
  if (type === "validate-guest") {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token manquant" });
      }
      const token = authHeader.replace("Bearer ", "");
      let userId = null;
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
          userId = payload.sub || payload.user_id;
        }
      } catch {}
      if (!userId) return res.status(401).json({ error: "Token JWT invalide" });

      const rawCode = (req.body?.code || "").trim();
      if (!rawCode) return res.status(400).json({ ok: false, error: "Code manquant" });

      const { createClient } = require("@supabase/supabase-js");
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

      // 1. Récupérer le code (correspondance exacte, sensible à la casse)
      const { data: gc, error: gcErr } = await supabase
        .from("guest_codes")
        .select("*")
        .eq("code", rawCode)
        .maybeSingle();

      if (gcErr) return res.status(500).json({ ok: false, error: "Erreur lecture code" });
      if (!gc)   return res.status(404).json({ ok: false, error: "Code invalide" });

      // 2. Vérifications de validité
      if (gc.actif === false) {
        return res.status(403).json({ ok: false, error: "Ce code n'est plus actif" });
      }
      if (gc.expires_at && new Date(gc.expires_at).getTime() < Date.now()) {
        return res.status(403).json({ ok: false, error: "Ce code a expiré" });
      }
      if (gc.max_uses != null && (gc.uses_count || 0) >= gc.max_uses) {
        return res.status(403).json({ ok: false, error: "Ce code a atteint sa limite d'utilisation" });
      }

      // 3. Écrire l'accès invité (select-then-update/insert) — AVEC contrôle d'erreur
      const nowIso = new Date().toISOString();
      const { data: existing } = await supabase
        .from("user_access")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      let writeErr = null;
      if (existing) {
        const { error } = await supabase.from("user_access")
          .update({ status: "guest", guest_code: gc.code, approved_at: nowIso, updated_at: nowIso })
          .eq("user_id", userId);
        writeErr = error;
      } else {
        const { error } = await supabase.from("user_access")
          .insert({ user_id: userId, status: "guest", guest_code: gc.code, approved_at: nowIso, updated_at: nowIso });
        writeErr = error;
      }

      if (writeErr) {
        // L'écriture a échoué → on le DIT, au lieu de prétendre que c'est validé
        console.error("[send] validate-guest write error:", writeErr.message);
        return res.status(500).json({ ok: false, error: `Écriture accès échouée : ${writeErr.message}` });
      }

      // 4. Vérifier que la ligne est bien en "guest" (lecture de contrôle)
      const { data: check } = await supabase
        .from("user_access")
        .select("status")
        .eq("user_id", userId)
        .maybeSingle();
      if (check?.status !== "guest") {
        return res.status(500).json({ ok: false, error: "Statut non confirmé après écriture" });
      }

      // 5. Marquer le Premium invité dans Clerk publicMetadata (chemin fiable,
      //    identique à un abonné Stripe — lu instantanément par useUser au rechargement).
      try {
        await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
          method:  "PATCH",
          headers: { "Authorization": `Bearer ${process.env.CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
          body:    JSON.stringify({ public_metadata: { guestAccess: true } }),
        });
      } catch (e) {
        console.warn("[send] validate-guest clerk metadata:", e.message);
      }

      // 6. Incrémenter le compteur d'utilisation du code
      await supabase.from("guest_codes")
        .update({ uses_count: (gc.uses_count || 0) + 1 })
        .eq("id", gc.id);

      return res.json({ ok: true, message: "Code invité validé — accès Premium activé" });
    } catch (e) {
      console.error("[send] validate-guest:", e.message);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }


  // ════════════════════════════════════════════════════════════════════════
  // ACQUISITION-STATS — Stats consolidées pour Pilotage (admin uniquement)
  // POST /api/send?type=acquisition-stats
  // Renvoie : total, par source, évolution hebdomadaire, comparaison sem-1
  // ════════════════════════════════════════════════════════════════════════
  if (type === "acquisition-stats") {
    try {
      // ── Auth Clerk admin ───────────────────────────────────────────────
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token manquant" });
      }
      const token = authHeader.replace("Bearer ", "");
      let userId = null;
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
          userId = payload.sub || payload.user_id;
        }
      } catch {}
      if (!userId) return res.status(401).json({ error: "Token JWT invalide" });

      const verifyRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: { "Authorization": `Bearer ${process.env.CLERK_SECRET_KEY}` },
      });
      if (!verifyRes.ok) return res.status(401).json({ error: "User Clerk introuvable" });
      const clerkUser = await verifyRes.json();
      const userEmail = clerkUser.email_addresses?.[0]?.email_address?.toLowerCase();
      const ADMIN_EMAILS = ["mongazon360@gmail.com", "jordankrebs1@gmail.com"];
      if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
        return res.status(403).json({ error: "Accès admin uniquement" });
      }

      // ── Récupérer toutes les preinscriptions Supabase ─────────────────
      const { createClient } = require("@supabase/supabase-js");
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const { data: rows, error } = await supabase
        .from("preinscriptions")
        .select("email, source, created_at")
        .order("created_at", { ascending: true });
      if (error) throw new Error("Supabase: " + error.message);

      // ── Exclure admins ─────────────────────────────────────────────────
      const filtered = (rows || []).filter(r => {
        const e = (r.email || "").toLowerCase().trim();
        return !ADMIN_EMAILS.includes(e);
      });

      const total = filtered.length;

      // ── Aggregation par source ─────────────────────────────────────────
      const bySource = {};
      filtered.forEach(r => {
        const s = (r.source || "direct").toLowerCase();
        bySource[s] = (bySource[s] || 0) + 1;
      });

      // ── Évolution hebdomadaire (8 dernières semaines) ──────────────────
      // On utilise ISO week (lundi → dimanche)
      const now = new Date();
      const weeks = [];
      for (let i = 7; i >= 0; i--) {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay() - i * 7 + 1); // lundi semaine -i
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        weeks.push({ start, end, count: 0, label: "" });
      }
      weeks.forEach((w, idx) => {
        w.label = idx === 7 ? "Cette semaine"
                 : idx === 6 ? "S-1"
                 : `S-${7 - idx}`;
      });
      filtered.forEach(r => {
        const d = new Date(r.created_at);
        weeks.forEach(w => {
          if (d >= w.start && d < w.end) w.count++;
        });
      });

      // ── Évolution vs semaine dernière ─────────────────────────────────
      const lastWeek    = weeks[7].count;
      const prevWeek    = weeks[6].count;
      let evolutionPct  = null;
      let evolutionDir  = "stable";
      if (prevWeek === 0 && lastWeek > 0) {
        evolutionDir = "up";
        evolutionPct = null; // démarrage
      } else if (prevWeek > 0) {
        evolutionPct = Math.round(((lastWeek - prevWeek) / prevWeek) * 100);
        if (evolutionPct > 5) evolutionDir = "up";
        else if (evolutionPct < -5) evolutionDir = "down";
        else evolutionDir = "stable";
      }

      // ── Today / Yesterday count ───────────────────────────────────────
      const startToday = new Date(now);
      startToday.setHours(0, 0, 0, 0);
      const startYesterday = new Date(startToday);
      startYesterday.setDate(startYesterday.getDate() - 1);

      let todayCount = 0, yesterdayCount = 0;
      filtered.forEach(r => {
        const d = new Date(r.created_at);
        if (d >= startToday) todayCount++;
        else if (d >= startYesterday) yesterdayCount++;
      });

      return res.json({
        timestamp:    new Date().toISOString(),
        total,
        bySource,
        weeks: weeks.map(w => ({ label: w.label, count: w.count, start: w.start.toISOString() })),
        evolution: {
          thisWeek: lastWeek,
          prevWeek,
          pct:      evolutionPct,
          dir:      evolutionDir,
        },
        todayCount,
        yesterdayCount,
      });
    } catch (e) {
      console.error("[acquisition-stats]", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // AUDIT-USERS — Diff Clerk ↔ Supabase preinscriptions (admin uniquement)
  // POST /api/send?type=audit-users               → liste comparaison
  // POST /api/send?type=audit-users&action=sync   → insère les manquants
  // Sécurité : Bearer token Clerk + vérification email dans ADMIN_EMAILS
  // ════════════════════════════════════════════════════════════════════════
  if (type === "audit-users") {
    try {
      // ── Auth Clerk Bearer obligatoire ──────────────────────────────────
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token manquant" });
      }

      // ── Décodage JWT pour user_id ──────────────────────────────────────
      const token = authHeader.replace("Bearer ", "");
      let userId = null;
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
          userId = payload.sub || payload.user_id;
        }
      } catch {}
      if (!userId) return res.status(401).json({ error: "Token JWT invalide" });

      // ── Vérification que c'est bien un admin ───────────────────────────
      const verifyRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: { "Authorization": `Bearer ${process.env.CLERK_SECRET_KEY}` },
      });
      if (!verifyRes.ok) return res.status(401).json({ error: "User Clerk introuvable" });
      const clerkUser = await verifyRes.json();
      const userEmail = clerkUser.email_addresses?.[0]?.email_address?.toLowerCase();
      const ADMIN_EMAILS = ["mongazon360@gmail.com", "jordankrebs1@gmail.com"];

      if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
        return res.status(403).json({ error: "Accès admin uniquement" });
      }

      // 1. Récupérer tous les users Clerk (paginé, max 500 utilisateurs)
      const clerkUsers = [];
      let offset = 0;
      const limit = 100;
      while (offset < 500) {
        const clerkRes = await fetch(
          `https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`,
          { headers: { "Authorization": `Bearer ${process.env.CLERK_SECRET_KEY}` } }
        );
        if (!clerkRes.ok) throw new Error(`Clerk API ${clerkRes.status}`);
        const batch = await clerkRes.json();
        if (!batch.length) break;
        clerkUsers.push(...batch);
        offset += limit;
        if (batch.length < limit) break;
      }

      const clerkEmailsRaw = clerkUsers
        .map(u => u.email_addresses?.[0]?.email_address?.toLowerCase().trim())
        .filter(Boolean);

      // ── Exclure les emails admin du comptage et du sync ──────────────────
      const clerkEmails = clerkEmailsRaw.filter(e => !ADMIN_EMAILS.includes(e));

      // 2. Récupérer toutes les preinscriptions Supabase
      const { createClient } = require("@supabase/supabase-js");
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const { data: preinscriptions, error: preErr } = await supabase
        .from("preinscriptions")
        .select("email");
      if (preErr) throw new Error("Supabase: " + preErr.message);

      const supaEmailsRaw = (preinscriptions || []).map(p => p.email.toLowerCase().trim());
      // Exclure aussi les admins côté Supabase (au cas où ils s'y seraient glissés)
      const supaEmails = supaEmailsRaw.filter(e => !ADMIN_EMAILS.includes(e));
      const supaSet = new Set(supaEmails);
      const clerkSet = new Set(clerkEmails);

      // 3. Calculer les diffs
      const onlyInClerk = clerkEmails.filter(e => !supaSet.has(e));
      const onlyInSupa  = supaEmails.filter(e => !clerkSet.has(e));
      const common      = clerkEmails.filter(e => supaSet.has(e));

      // 4. Action sync : insère les manquants Clerk dans preinscriptions
      let syncResult = null;
      if (req.query.action === "sync" && onlyInClerk.length > 0) {
        const toInsert = onlyInClerk.map(email => ({
          email,
          source: "clerk_signup_rattrapage",
        }));
        const { data, error } = await supabase
          .from("preinscriptions")
          .insert(toInsert)
          .select();
        if (error) {
          syncResult = { success: false, error: error.message };
        } else {
          syncResult = { success: true, inserted: data?.length || 0 };
        }
      }

      return res.json({
        timestamp:   new Date().toISOString(),
        clerk_total: clerkEmails.length,
        supa_total:  supaEmails.length,
        common:      common.length,
        onlyInClerk: { count: onlyInClerk.length, emails: onlyInClerk },
        onlyInSupa:  { count: onlyInSupa.length,  emails: onlyInSupa  },
        sync:        syncResult,
      });
    } catch (e) {
      console.error("[audit-users]", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // CUSTOMER-PORTAL — Lien Stripe Customer Portal (mention 10 avocat)
  // POST /api/send?type=customer-portal — Bearer Clerk obligatoire
  // ════════════════════════════════════════════════════════════════════════
  if (type === "customer-portal") {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token manquant" });
      }

      // ── Décodage JWT Clerk pour user_id ────────────────────────────────
      const token = authHeader.replace("Bearer ", "");
      let userId = null;
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
          userId = payload.sub || payload.user_id;
        }
      } catch {}

      if (!userId) return res.status(401).json({ error: "Token JWT invalide" });

      // ── Vérification user existe côté Clerk Admin API ─────────────────
      const verifyRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: { "Authorization": `Bearer ${process.env.CLERK_SECRET_KEY}` },
      });
      if (!verifyRes.ok) return res.status(401).json({ error: "User Clerk introuvable" });
      const clerkUser = await verifyRes.json();
      const email = clerkUser.email_addresses?.[0]?.email_address;
      if (!email) return res.status(400).json({ error: "Email Clerk introuvable" });

      // ── Trouver le customer Stripe par email ───────────────────────────
      const Stripe = require("stripe");
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      const customers = await stripe.customers.list({ email, limit: 1 });
      if (!customers.data.length) {
        return res.status(404).json({ error: "Aucun abonnement Stripe trouvé pour cet email" });
      }
      const customerId = customers.data[0].id;

      // ── Créer une session du Customer Portal ───────────────────────────
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.VITE_APP_URL || "https://mongazon360.fr"}/parametres`,
      });

      return res.json({ url: portalSession.url });
    } catch (e) {
      console.error("[customer-portal]", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

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

  // ── ALERT ─────────────────────────────────────────────────────────────────
  if (type === "alert") {
    try {
      const { type: alertType, message, details = {}, severity = "error" } = req.body;
      if (!alertType || !message) throw new Error("type et message requis");

      const severityEmoji = { error: "🔴", warning: "🟠", info: "🔵" }[severity] || "🔴";
      const severityLabel = { error: "ERREUR CRITIQUE", warning: "AVERTISSEMENT", info: "INFO" }[severity] || "ERREUR";
      const year = new Date().getFullYear();

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;background:#0d2b1a;margin:0;padding:24px;">
<div style="max-width:600px;margin:0 auto;background:#1a4731;border-radius:16px;overflow:hidden;">
  <div style="background:#0d2b1a;padding:20px 24px;border-bottom:2px solid #2d7d52;">
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:32px;">🌿</span>
      <div>
        <div style="color:#a5d6a7;font-size:18px;font-weight:800;">Mongazon360<sup style="font-size:10px;">™</sup></div>
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
    <div style="color:#4a7c5c;font-size:11px;">Mongazon360<sup style="font-size:8px;">™</sup> — Système d'alerte automatique</div>
    <div style="color:#4a7c5c;font-size:9px;margin-top:4px;">
      © ${year} Mongazon360<sup style="font-size:7px;">™</sup> — Marque déposée à l'EUIPO
    </div>
  </div>
</div>
</body></html>`;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from:    "Mongazon360 Pilotage <bonjour@mongazon360.fr>",
          to:      ["mongazon360@gmail.com"],
          subject: `${severityEmoji} [MG360™] ${severityLabel} — ${alertType}`,
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
          subject: `🌿 [Mongazon360™] Rappel : ${reminders.map(r => r.label).join(", ")}`,
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
