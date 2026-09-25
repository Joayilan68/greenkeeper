// api/send.js
// POST /api/send?type=alert|alert-test|notification-test|reminder|save-sub|save-reminders
// GET  /api/send → cron quotidien 8h00 (Vercel cron)

const REMINDER_LABELS = {
  tonte:     { icon:"✂️", label:"Tonte",               desc:"Fréquence de tonte recommandée" },
  arrosage:  { icon:"💧", label:"Arrosage",             desc:"Rappel d'arrosage régulier" },
  engrais:   { icon:"🌱", label:"Engrais",              desc:"Application d'engrais" },
  fongicide: { icon:"💊", label:"Traitement fongicide", desc:"Prévention maladies fongiques" },
  aeration:  { icon:"🌀", label:"Aération",             desc:"Aération du sol" },
  desherbage:{ icon:"🪴", label:"Désherbage",           desc:"Élimination des mauvaises herbes" },
};

function buildReminderHtml(reminders, userName, profile) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.1);">
  <div style="background:#1a4731;padding:24px 28px;">
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:32px;">🌿</span>
      <div>
        <div style="color:#a5d6a7;font-size:18px;font-weight:800;">Mongazon360<sup style="font-size:10px;">®</sup></div>
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
        L'équipe Mongazon360<sup style="font-size:8px;">®</sup>
      </p>
    </div>
  </div>
  <div style="background:#f9fbe7;padding:14px 28px;border-top:1px solid #e8f5e9;text-align:center;">
    <div style="color:#4a7c5c;font-size:10px;">Mongazon360<sup style="font-size:7px;">®</sup> — Rappels personnalisés</div>
    <div style="color:#81c784;font-size:9px;margin-top:4px;">
      © ${year} Mongazon360<sup style="font-size:7px;">®</sup> — Marque déposée et enregistrée à l'EUIPO ·
      <a href="https://mongazon360.fr/mentions-legales" style="color:#52b788;">Mentions légales</a>
    </div>
    <div style="color:#9e9e9e;font-size:8px;line-height:1.5;text-align:left;margin-top:10px;padding-top:10px;border-top:1px solid #e8f5e9;">
      Vous bénéficiez d'un droit d'accès, d'opposition, de rectification, de suppression et, à certaines conditions, de portabilité de vos données personnelles en vous adressant à la Société Mongazon360, <a href="mailto:contact@mongazon360.fr" style="color:#52b788;">contact@mongazon360.fr</a>. Vous avez également le droit de retirer votre consentement à nos envois de nature commerciale à tout moment. Vous bénéficiez également du droit d'introduire une réclamation auprès de la CNIL. Nous vous invitons à consulter notre politique d'utilisation des données personnelles disponible <a href="https://mongazon360.fr/confidentialite" style="color:#52b788;">ici</a>.
    </div>
  </div>
</div>
</body></html>`;
}

// Email « Conseil du jour » : relais des notifications quotidiennes pour les comptes
// qui ont consenti aux conseils mais n'ont pas (ou plus) d'abonnement push actif.
function buildConseilEmailHtml(prenom, title, body) {
  const year = new Date().getFullYear();
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.1);">
  <div style="background:#1a4731;padding:24px 28px;">
    <div style="color:#a5d6a7;font-size:18px;font-weight:800;">Mongazon360<sup style="font-size:10px;">®</sup></div>
    <div style="color:#4a7c5c;font-size:11px;font-style:italic;">Tant qu'il y a gazon, il y a match</div>
  </div>
  <div style="padding:24px 28px;">
    <div style="font-size:13px;color:#888;margin-bottom:8px;">Bonjour ${esc(prenom)}, voici le conseil de Bob :</div>
    <div style="padding:16px;background:#f9fbe7;border-radius:12px;border-left:4px solid #43a047;margin-bottom:24px;">
      <div style="font-size:17px;font-weight:800;color:#1a4731;margin-bottom:6px;">${esc(title)}</div>
      <div style="font-size:14px;color:#555;line-height:1.6;">${esc(body)}</div>
    </div>
    <div style="text-align:center;margin-bottom:20px;">
      <a href="https://mongazon360.fr/today" style="background:#1a4731;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:800;display:inline-block;">🌿 Ouvrir Mongazon360 →</a>
    </div>
    <div style="font-size:12px;color:#888;line-height:1.6;">📱 Astuce : autorise les notifications de l'app sur ton téléphone pour recevoir ces conseils en direct plutôt que par email.</div>
  </div>
  <div style="background:#f9fbe7;padding:14px 28px;border-top:1px solid #e8f5e9;text-align:center;">
    <div style="color:#4a7c5c;font-size:10px;">Tu reçois cet email car tu as activé les conseils quotidiens (2 maximum par jour). <a href="https://mongazon360.fr/parametres" style="color:#52b788;">Ne plus les recevoir</a></div>
    <div style="color:#81c784;font-size:9px;margin-top:4px;">© ${year} Mongazon360<sup style="font-size:7px;">®</sup> — Marque déposée et enregistrée à l'EUIPO · <a href="https://mongazon360.fr/mentions-legales" style="color:#52b788;">Mentions légales</a> · <a href="https://mongazon360.fr/confidentialite" style="color:#52b788;">Confidentialité</a></div>
  </div>
</div></body></html>`;
}

// Email de relance fin d'essai Premium (transactionnel — service en cours)
function buildTrialEmailHtml(prenom, when) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.1);">
  <div style="background:#1a4731;padding:24px 28px;">
    <div style="color:#a5d6a7;font-size:18px;font-weight:800;">Mongazon360<sup style="font-size:10px;">®</sup></div>
    <div style="color:#4a7c5c;font-size:11px;font-style:italic;">Tant qu'il y a gazon, il y a match</div>
  </div>
  <div style="padding:24px 28px;">
    <div style="font-size:20px;font-weight:800;color:#1a4731;margin-bottom:10px;">⭐ Ton essai Premium se termine ${when}, ${prenom}</div>
    <div style="font-size:14px;color:#555;line-height:1.7;margin-bottom:8px;">
      Ces 7 jours t'ont donné accès au <b>diagnostic photo de Bob</b>, à l'<b>arrosage précis</b> et à tous les conseils personnalisés pour ton gazon.
    </div>
    <div style="font-size:14px;color:#555;line-height:1.7;margin-bottom:20px;">
      Pour garder ton gazon sur la bonne voie sans interruption, passe Premium — <b>4,99 €/mois</b>, sans engagement, résiliable à tout moment.
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://mongazon360.fr/subscribe" style="background:#43a047;color:#fff;text-decoration:none;padding:15px 34px;border-radius:12px;font-size:15px;font-weight:800;display:inline-block;">Garder mon Premium →</a>
    </div>
    <div style="font-size:12px;color:#888;line-height:1.6;">Sans action de ta part, ton compte repasse simplement en version gratuite — tu gardes ton profil et ton score. 🌿</div>
  </div>
  <div style="background:#f9fbe7;padding:14px 28px;border-top:1px solid #e8f5e9;text-align:center;">
    <div style="color:#81c784;font-size:9px;">© ${year} Mongazon360<sup style="font-size:7px;">®</sup> — Marque déposée et enregistrée à l'EUIPO · <a href="https://mongazon360.fr/mentions-legales" style="color:#52b788;">Mentions légales</a></div>
  </div>
</div></body></html>`;
}

// Socle quotidien : conseils gazon utiles (voix de Bob), rotation par jour
const CONSEILS_QUOTIDIENS = [
  { title:"✂️ Le conseil de Bob",     body:"Ne tonds jamais plus d'un tiers de la hauteur d'un coup : ton gazon reste dense et résiste mieux." },
  { title:"💧 Astuce arrosage",       body:"Arrose tôt le matin plutôt que le soir : moins d'évaporation, moins de maladies." },
  { title:"🌱 Bob te souffle",         body:"Une lame de tonte bien affûtée coupe net ; une lame émoussée déchire et jaunit les pointes." },
  { title:"☀️ Le saviez-vous",         body:"En période chaude, remonte la hauteur de tonte : une herbe plus haute garde le sol frais." },
  { title:"🍂 Conseil du jour",        body:"Ramasse les feuilles mortes : sous un tapis de feuilles, le gazon s'asphyxie et la mousse s'installe." },
  { title:"🌿 Bob rappelle",           body:"Laisse parfois les tontes fines sur place (mulching) : elles nourrissent ton sol gratuitement." },
  { title:"💪 Astuce racines",         body:"Arrose moins souvent mais plus abondamment : les racines plongent et ton gazon devient plus résistant." },
  { title:"🔍 L'œil de Bob",           body:"Des taches jaunes qui s'étendent ? Prends-les en photo dans l'app, je te dis ce que c'est." },
  { title:"🌾 Conseil semis",          body:"Un sol bien griffé avant de semer, c'est deux fois plus de graines qui lèvent." },
  { title:"🪱 Bob t'explique",         body:"Des vers de terre, c'est bon signe : ils aèrent ton sol mieux qu'aucun outil." },
  { title:"🌡️ Astuce saison",         body:"Le gazon pousse surtout quand le sol est entre 10 et 25 °C : c'est là qu'il faut le chouchouter." },
  { title:"🚫 Erreur fréquente",       body:"Trop d'engrais brûle le gazon. Mieux vaut peu, mais au bon moment." },
  { title:"🌧️ Bob observe le ciel",   body:"Pluie annoncée ? Reporte l'arrosage : inutile de doubler ce que fait la nature." },
  { title:"🏆 Motivation du jour",     body:"Un beau gazon, c'est de la régularité, pas de l'effort intense. Un petit geste vaut mieux qu'un grand coup." },
  { title:"🌱 Conseil densité",        body:"Un gazon dense étouffe les mauvaises herbes tout seul : vise l'épaisseur avant tout." },
  { title:"✂️ Bob insiste",           body:"Varie le sens de tonte à chaque passage : l'herbe se redresse mieux et pousse plus droite." },
  { title:"💚 Astuce couleur",         body:"Un gazon qui vire au bleu-gris a soif : c'est le tout premier signe, avant le jaune." },
  { title:"🌍 Le mot de Bob",          body:"Un gazon en bonne santé, c'est aussi de la fraîcheur, de l'oxygène et de la biodiversité chez toi." },
];

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Secret");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── GET = CRON (matin 8h / soir 17h locale via Vercel) ────────────────────
  // Itération 2a : PUSH piloté par le moteur intelligent (notificationEngine).
  //   ?slot=matin (défaut) → priorité la plus haute disponible (niveaux 2-6)
  //   ?slot=soir           → arrosage (N10, bilan hydrique ET₀)
  // Sans abonnement push actif, la même décision part par EMAIL (conseils par email).
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

      const { decideNotification, appendNotifLog } = require("./notificationEngine.cjs");
      const { clerkGuestActive } = require("./premium.cjs");
      // ← nouveau : source de vérité de la phase parcours, partagée avec Today.jsx/phaseParcours()
      const { currentPhase } = require("./parcoursEngine.cjs");

      // Purge d'un abonnement périmé : FCM renvoie 404/410 quand l'endpoint est mort.
      // On le supprime pour que la table reste propre et que 'skipped' soit fiable.
      const pruneSub = async (err, uid) => {
        const code = err && err.statusCode;
        if (code === 404 || code === 410) {
          try { await supabase.from("push_subscriptions").delete().eq("user_id", uid); }
          catch (e) { console.error("prune sub:", uid, e.message); }
        }
      };

      // Comptes Clerk (email + prénom), chargés une seule fois par exécution
      let clerkUsersCache = null;
      const getClerkUsers = async () => {
        if (clerkUsersCache) return clerkUsersCache;
        const users = [];
        for (let page = 0, offset = 0; page < 20; page++, offset += 100) {
          const r = await fetch(`https://api.clerk.com/v1/users?limit=100&offset=${offset}&order_by=-created_at`,
            { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`, "Content-Type": "application/json" } });
          if (!r.ok) throw new Error(`Clerk : liste des comptes refusée (HTTP ${r.status})`);
          const j = await r.json();
          const batch = Array.isArray(j) ? j : (j.data || []);
          users.push(...batch);
          if (batch.length < 100) break;
        }
        clerkUsersCache = users;
        return users;
      };
      const primaryEmail = (u) => u.email_addresses?.find(e => e.id === u.primary_email_address_id)?.email_address
                               || u.email_addresses?.[0]?.email_address || null;

      // Conseils par email : relais des notifications pour les comptes consentants sans abonnement
      // push actif. Mêmes décisions et même plafond (2/jour) que le push ; budget par exécution
      // pour rester sous le quota Resend gratuit (100 emails/jour, tous envois confondus).
      const EMAIL_CONSEILS_PAR_CRENEAU = 45;
      let emailFallbackSent = 0, emailFallbackCapped = 0;
      const sendConseilEmail = async (to, prenom, title, body) => {
        if (emailFallbackSent >= EMAIL_CONSEILS_PAR_CRENEAU) { emailFallbackCapped++; return false; }
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from:    "Bob de Mongazon360 <bonjour@mongazon360.fr>",
            to:      [to],
            subject: title,
            html:    buildConseilEmailHtml(prenom, title, body),
            headers: { "List-Unsubscribe": "<https://mongazon360.fr/parametres>" },
          }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || d.error) throw new Error("Resend : " + (d.error?.message || r.status));
        emailFallbackSent++;
        return true;
      };

      // Créneau courant (matin par défaut si non précisé)
      const slot = (req.query.slot === "soir") ? "soir" : "matin";
      const today = new Date().toISOString().slice(0, 10);
      const month = new Date().getMonth() + 1;

      // Récupérer rappels + souscriptions + consentements + profils + parcours actifs
      const [{ data: remindersData }, { data: subsData }, { data: consentsData }, { data: profilesData }, { data: parcoursActifsData }] = await Promise.all([
        supabase.from("reminders").select("*"),
        supabase.from("push_subscriptions").select("*"),
        supabase.from("user_consents").select("user_id, notifications, marketing"),
        supabase.from("profiles").select("user_id, data"),
        supabase.from("parcours").select("*").eq("statut", "actif"),
      ]);

      const subMap = {};
      (subsData || []).forEach(s => { subMap[s.user_id] = s.subscription; });
      const consentMap = {};
      (consentsData || []).forEach(c => { consentMap[c.user_id] = c; });
      const profileMap = {};
      (profilesData || []).forEach(p => { profileMap[p.user_id] = p.data || {}; });
      // ← nouveau : parcours actif par user (un seul actif possible, cf. règle useParcours.js)
      const parcoursMap = {};
      (parcoursActifsData || []).forEach(p => { parcoursMap[p.user_id] = p; });

      // Destinataires des conseils par email : consentement « notifications » sans abonnement push
      const emailConseilMap = {}; // user_id → { email, prenom }
      if ((consentsData || []).some(c => c.notifications && !subMap[c.user_id])) {
        try {
          for (const u of await getClerkUsers()) {
            const email = primaryEmail(u);
            if (email && consentMap[u.id]?.notifications && !subMap[u.id]) {
              emailConseilMap[u.id] = { email, prenom: u.first_name || "jardinier" };
            }
          }
        } catch (e) { await require("./alerting.cjs").reportServerError("Tâche planifiée — conseils par email", e); }
      }

      // Cache météo par zone arrondie (1 fetch/zone/exécution → protège le quota)
      const weatherCache = {};
      async function getWeatherForUser(profile) {
        const lat = profile && profile.lat;
        const lon = profile && profile.lon;
        if (typeof lat !== "number" || typeof lon !== "number") return null;
        const key = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
        if (key in weatherCache) return weatherCache[key];
        try {
          const base = process.env.SELF_BASE_URL || "https://mongazon360.fr";
          const r = await fetch(`${base}/api/weather?lat=${lat}&lon=${lon}&premium=true`);
          if (!r.ok) { weatherCache[key] = null; return null; }
          const data = await r.json();
          const d = data.daily || {};
          // On expose au moteur la météo du JOUR (index 0)
          const w = {
            temp_min: d.temperature_2m_min ? d.temperature_2m_min[0] : null,
            temp_max: d.temperature_2m_max ? d.temperature_2m_max[0] : null,
            precip:   d.precipitation_sum  ? d.precipitation_sum[0]  : null,
            wind:     d.windspeed_10m_max  ? d.windspeed_10m_max[0]  : null,
            soil_temp: d.soil_temp ? d.soil_temp[0] : null,
            et0:      d.et0 ? d.et0[0] : null,
          };
          weatherCache[key] = w;
          return w;
        } catch (e) {
          require("./alerting.cjs").reportServerError("Tâche planifiée — météo", e);
          weatherCache[key] = null;
          return null;
        }
      }

      let pushSent = 0, emailSent = 0, skipped = 0;
      const pushedToday = new Set(); // users déjà notifiés ce jour (anti-doublon socle/relance)

      for (const row of (remindersData || [])) {
        const { user_id, email, preferences, notif_log } = row;
        const prefs = preferences || {};
        const userConsents = consentMap[user_id] || {};
        const profile = profileMap[user_id] || {};
        const sub = subMap[user_id];

        // Déjà servi sur ce créneau aujourd'hui (exécution relancée) → pas de socle en plus
        if (notif_log?.history?.some(h => h.date === today && h.slot === slot)) pushedToday.add(user_id);

        const contact = emailConseilMap[user_id];
        const weather = (userConsents.notifications && (sub || contact)) || (userConsents.marketing && email)
          ? await getWeatherForUser(profile)
          : null;

        // ── État réel du parcours actif — MÊME source que Today.jsx (phaseParcours/useParcours) ──
        const parcoursRow = parcoursMap[user_id];
        let parcoursState = parcoursRow
          ? currentPhase({ type: parcoursRow.type, dateSemis: parcoursRow.date_semis, today })
          : null;
        if (parcoursState && parcoursState.termine) parcoursState = null; // aligné : phaseParcours() renvoie null si J>60

        // Décision UNIQUE du moteur (sert au push ET à l'email)
        const decision = decideNotification({
          profile, weather,
          reminderPrefs: prefs,
          history: Array.isArray(profile.history) ? profile.history : [],
          notifLog: notif_log,
          month, slot, today,
          gami: profile.gamification || null,
          parcours: parcoursState, // ← nouveau
        });

        if (!decision) continue;

        let logUpdated = notif_log;

        // ── PUSH : toute décision, si consentement + subscription ─────────────
        if (userConsents.notifications && sub) {
          try {
            await webpush.sendNotification(sub, JSON.stringify({
              title: decision.title,
              body:  decision.body,
              icon:  "/icon-192.png",
              tag:   decision.tag,
              url:   decision.url,
              actionRoute: decision.url,
            }));
            logUpdated = appendNotifLog(logUpdated, {
              date: today, priority: decision.priority, type: decision.type, slot,
            });
            pushSent++;
            pushedToday.add(user_id);
          } catch (e) {
            console.error("cron push:", user_id, e.message);
            await pruneSub(e, user_id);
            skipped++;
          }
        }

        // ── CONSEIL PAR EMAIL : même décision que le push, pour les comptes sans abonnement ──
        if (userConsents.notifications && !sub && contact) {
          try {
            if (await sendConseilEmail(contact.email, contact.prenom, decision.title, decision.body)) {
              logUpdated = appendNotifLog(logUpdated, {
                date: today, priority: decision.priority, type: decision.type, slot, channel: "email",
              });
              pushedToday.add(user_id);
            }
          } catch (e) { await require("./alerting.cjs").reportServerError("Tâche planifiée — conseils par email", e, { user: user_id }); }
        }

        // ── EMAIL : UNIQUEMENT urgences niveau 1, max 1/jour ──────────────────
        // Consentement marketing requis. Plafond via notif_log (email_sent flag du jour).
        if (decision.priority === 1 && userConsents.marketing && email) {
          const alreadyEmailedToday = (logUpdated && Array.isArray(logUpdated.history))
            ? logUpdated.history.some(h => h.date === today && h.channel === "email")
            : false;
          if (!alreadyEmailedToday) {
            try {
              const emailRes = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { "Content-Type":"application/json", "Authorization":`Bearer ${process.env.RESEND_API_KEY}` },
                body: JSON.stringify({
                  from:    "Mongazon360 <bonjour@mongazon360.fr>",
                  to:      [email],
                  subject: `🌿 [Mongazon360®] ${decision.title}`,
                  html:    buildReminderHtml(
                             [{ icon: "⚠️", label: decision.title, desc: decision.body }],
                             "Jardinier", profile
                           ),
                }),
              });
              const d = await emailRes.json();
              if (!d.error) {
                logUpdated = appendNotifLog(logUpdated, {
                  date: today, priority: 1, type: decision.type, slot, channel: "email",
                });
                emailSent++;
              }
            } catch (e) { console.error("cron email:", e.message); }
          }
        }

        // Persister le notif_log si modifié
        if (logUpdated !== notif_log) {
          await supabase.from("reminders")
            .update({ notif_log: logUpdated, updated_at: new Date().toISOString() })
            .eq("user_id", user_id);
        }
      }

      // ── SURVEILLANCE DES PARCOURS (fenêtre de semis) — créneau MATIN ────────
      // Pour chaque parcours 'en_attente_fenetre' : détecter l'ouverture de la
      // fenêtre (canSow) et notifier selon N12/N13 (ouverture + relance) et N14
      // (anticipation ~10-14j avant). La notif parcours s'AJOUTE à l'entretien.
      let parcoursSent = 0;
      if (slot === "matin") {
        try {
          const { canSow } = require("./parcoursEngine.cjs");
          const { data: parcoursData } = await supabase
            .from("parcours")
            .select("*")
            .eq("statut", "en_attente_fenetre");

          for (const p of (parcoursData || [])) {
            const profile = profileMap[p.user_id] || {};
            const sub = subMap[p.user_id];
            const consent = consentMap[p.user_id] || {};
            if (!consent.notifications || !sub) continue; // pas de push possible

            const lat = profile.lat, lon = profile.lon;
            // Verdict pour AUJOURD'HUI (date du jour = candidat de semis)
            const verdict = canSow({ lat, lon, dateSemis: today, soilTempSource: "estime" });

            const ev = (p.etapes_validees && typeof p.etapes_validees === "object" && !Array.isArray(p.etapes_validees))
              ? p.etapes_validees : {};
            const suivi = ev.fenetre || { nbRappels: 0, premierRappel: null, dernierRappel: null, anticipe: false };

            let notif = null; // { title, body }

            // ── Fenêtre OUVERTE (feu_vert ou avertissement) → N12 / N13 ────────
            if (verdict.verdict === "feu_vert" || verdict.verdict === "avertissement") {
              const n = suivi.nbRappels || 0;
              // N13 : quotidien les 7 premiers jours, puis 1 fois tous les 3 jours
              const dernier = suivi.dernierRappel ? new Date(suivi.dernierRappel) : null;
              const joursDepuisDernier = dernier ? Math.floor((Date.now() - dernier.getTime()) / 86400000) : 999;
              const doitRelancer = (n < 7) ? (joursDepuisDernier >= 1) : (joursDepuisDernier >= 3);

              if (doitRelancer) {
                const typeLabel = p.type === "regarnissage" ? "regarnissage" : "semis";
                if (n === 0) {
                  notif = { title: "🌱 C'est le moment !",
                    body: `La fenêtre de ${typeLabel} vient de s'ouvrir dans votre région. Ouvrez l'app pour démarrer.` };
                } else if (n < 7) {
                  notif = { title: "🌱 Fenêtre de semis ouverte",
                    body: `Ne tardez pas : la fenêtre optimale de ${typeLabel} est en cours. Lancez votre parcours.` };
                } else {
                  notif = { title: "⏳ La fenêtre file",
                    body: `Votre fenêtre de ${typeLabel} reste ouverte, mais se referme peu à peu. C'est encore le bon moment.` };
                }
                suivi.nbRappels = n + 1;
                suivi.premierRappel = suivi.premierRappel || today;
                suivi.dernierRappel = today;
              }
            }
            // ── Fenêtre PAS ENCORE ouverte → N14 (anticipation, 1 seule fois) ──
            else if (verdict.verdict === "bloque" && verdict.prochaineFenetre && !suivi.anticipe) {
              // On envoie l'anticipation une seule fois quand on approche (heuristique :
              // dès qu'un parcours en attente est vu et pas encore anticipé).
              notif = { title: "⏳ Votre fenêtre de semis approche",
                body: `${verdict.prochaineFenetre}. Profitez-en pour préparer votre sol.` };
              suivi.anticipe = true;
            }

            if (notif) {
              try {
                await webpush.sendNotification(sub, JSON.stringify({
                  title: notif.title, body: notif.body,
                  icon: "/icon-192.png", tag: "mg360-parcours-fenetre",
                  url: "/parcours", actionRoute: "/parcours",
                }));
                await supabase.from("parcours")
                  .update({ etapes_validees: { ...ev, fenetre: suivi }, updated_at: new Date().toISOString() })
                  .eq("id", p.id);
                parcoursSent++;
              } catch (e) {
                console.error("cron parcours:", p.user_id, e.message);
                await pruneSub(e, p.user_id);
              }
            }
          }
        } catch (e) {
          require("./alerting.cjs").reportServerError("Tâche planifiée — surveillance parcours", e);
        }
      }

      // ── CLÔTURE AUTOMATIQUE des parcours terminés (J > 60) — créneau MATIN ──
      // Un parcours actif dont la date de semis dépasse 60 jours est considéré
      // terminé : on passe son statut à 'termine' pour libérer l'utilisateur
      // (plus de blocages d'entretien, carte Dashboard à jour).
      let parcoursTermines = 0;
      if (slot === "matin") {
        try {
          const limite = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
          const { data: aClore } = await supabase
            .from("parcours")
            .select("id")
            .eq("statut", "actif")
            .lt("date_semis", limite);
          for (const p of (aClore || [])) {
            const { error } = await supabase
              .from("parcours")
              .update({ statut: "termine", updated_at: new Date().toISOString() })
              .eq("id", p.id);
            if (!error) parcoursTermines++;
          }
        } catch (e) {
          require("./alerting.cjs").reportServerError("Tâche planifiée — clôture parcours", e);
        }
      }

      // ── RELANCE FIN D'ESSAI PREMIUM (email + push) — créneau MATIN ─────────
      // Lit l'état d'essai depuis Clerk (unsafe_metadata.trialStartedAt), relance
      // à J-2, J-1 et J-0 les comptes non abonnés, une seule fois par jalon.
      let trialRelances = 0;
      if (slot === "matin") {
        try {
          const TRIAL_MS = 7 * 24 * 60 * 60 * 1000;
          const clerkKey = process.env.CLERK_SECRET_KEY;
          for (const u of await getClerkUsers()) {
            const um = u.unsafe_metadata || {};
            const pm = u.public_metadata || {};
            const trialStart = um.trialStartedAt;
            if (!trialStart) continue;
            if (pm.isSubscribed === true || pm.subscriptionStatus === "active"
                || pm.subscriptionStatus === "trialing" || clerkGuestActive(pm)) continue;

            const daysLeft = Math.ceil((Number(trialStart) + TRIAL_MS - Date.now()) / 86400000);
            let flagKey = null, when = null;
            if      (daysLeft === 2 && !um.trialRemindedJ2) { flagKey = "trialRemindedJ2"; when = "dans 2 jours"; }
            else if (daysLeft === 1 && !um.trialRemindedJ1) { flagKey = "trialRemindedJ1"; when = "demain"; }
            else if (daysLeft <= 0 && !um.trialRemindedJ0)  { flagKey = "trialRemindedJ0"; when = "aujourd'hui"; }
            if (!flagKey) continue;

            const email  = primaryEmail(u);
            const sub    = subMap[u.id];
            const consent = consentMap[u.id] || {};
            const prenom = u.first_name || "Jardinier";

            if (consent.notifications && sub) {
              try {
                await webpush.sendNotification(sub, JSON.stringify({
                  title: `⭐ Ton essai Premium se termine ${when}`,
                  body:  "Garde le diagnostic de Bob et l'arrosage précis — passe Premium en un clic.",
                  icon: "/icon-192.png", tag: "mg360-trial-end", url: "/subscribe", actionRoute: "/subscribe",
                }));
                pushedToday.add(u.id);
              } catch (e) { console.error("cron trial push:", u.id, e.message); await pruneSub(e, u.id); }
            }
            if (email) {
              try {
                await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
                  body: JSON.stringify({
                    from: "Mongazon360 <bonjour@mongazon360.fr>",
                    to: [email],
                    subject: `⭐ Ton essai Premium Mongazon360 se termine ${when}`,
                    html: buildTrialEmailHtml(prenom, when),
                  }),
                });
              } catch (e) { console.error("cron trial email:", e.message); }
            }
            try {
              await fetch(`https://api.clerk.com/v1/users/${u.id}/metadata`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${clerkKey}` },
                body: JSON.stringify({ unsafe_metadata: { [flagKey]: true } }),
              });
            } catch (e) { console.error("cron trial flag:", u.id, e.message); }
            trialRelances++;
          }
        } catch (e) { await require("./alerting.cjs").reportServerError("Tâche planifiée — relances essai", e); }
      }

      // ── FIN DES PREMIUM OFFERTS À DATE (bêta…) — créneau MATIN ─────────────
      // Date de fin dépassée → user_access repasse en "approved" et Clerk perd
      // guestAccess/guestUntil. Les accès sans date (famille) ne sont jamais touchés.
      let premiumOffertsExpires = 0;
      if (slot === "matin") {
        try {
          const { todayParis } = require("./premium.cjs");
          const expired = new Set();
          const { data: rows } = await supabase.from("user_access")
            .select("user_id").eq("status", "guest").lt("guest_until", todayParis());
          for (const r of rows || []) expired.add(r.user_id);
          for (const u of await getClerkUsers()) {
            const pm = u.public_metadata || {};
            if (pm.guestAccess === true && !clerkGuestActive(pm)) expired.add(u.id);
          }
          for (const uid of expired) {
            await supabase.from("user_access")
              .update({ status: "approved", updated_at: new Date().toISOString() })
              .eq("user_id", uid).eq("status", "guest");
            const r = await fetch(`https://api.clerk.com/v1/users/${uid}/metadata`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
              body: JSON.stringify({ public_metadata: { guestAccess: null, guestUntil: null } }),
            });
            if (!r.ok) throw new Error(`Clerk : retrait du Premium offert refusé (HTTP ${r.status}) pour ${uid}`);
            premiumOffertsExpires++;
          }
        } catch (e) { await require("./alerting.cjs").reportServerError("Tâche planifiée — fin des Premium offerts", e); }
      }

      // ── SOCLE QUOTIDIEN — 1 conseil gazon utile/jour — créneau MATIN ───────
      // Garantit au moins une notification/jour aux comptes consentants qui
      // n'ont pas déjà reçu de push (moteur intelligent ou relance essai).
      let baselineSent = 0;
      if (slot === "matin") {
        const doy = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86400000);
        const tip = CONSEILS_QUOTIDIENS[((doy % CONSEILS_QUOTIDIENS.length) + CONSEILS_QUOTIDIENS.length) % CONSEILS_QUOTIDIENS.length];
        for (const s of (subsData || [])) {
          const uid = s.user_id;
          if (pushedToday.has(uid)) continue;
          const consent = consentMap[uid] || {};
          if (!consent.notifications) continue;
          try {
            await webpush.sendNotification(s.subscription, JSON.stringify({
              title: tip.title, body: tip.body, icon: "/icon-192.png",
              tag: "mg360-conseil-jour", url: "/today", actionRoute: "/today",
            }));
            pushedToday.add(uid);
            baselineSent++;
          } catch (e) { console.error("cron baseline:", uid, e.message); await pruneSub(e, uid); }
        }
        for (const [uid, contact] of Object.entries(emailConseilMap)) {
          if (pushedToday.has(uid)) continue;
          try {
            if (await sendConseilEmail(contact.email, contact.prenom, tip.title, tip.body)) pushedToday.add(uid);
          } catch (e) { await require("./alerting.cjs").reportServerError("Tâche planifiée — conseils par email", e, { user: uid }); }
        }
      }

      if (emailFallbackCapped) {
        await require("./alerting.cjs").reportServerError("Conseils par email — plafond atteint",
          new Error(`${emailFallbackCapped} conseil(s) non envoyé(s) : plafond de ${EMAIL_CONSEILS_PAR_CRENEAU} emails par créneau (quota Resend gratuit 100/jour)`));
      }

      // ── RÉTENTION RGPD — photos de diagnostic > 90 jours — créneau MATIN ──
      let photosPurgees = 0;
      if (slot === "matin") {
        try {
          const { purgeOldDiagnosticPhotos } = require("./photoRetention.cjs");
          photosPurgees = (await purgeOldDiagnosticPhotos()).deleted;
        } catch (e) { await require("./alerting.cjs").reportServerError("Tâche planifiée — purge photos (RGPD 90 j)", e); }
      }

      // ── Contrôle Groq — créneau MATIN : les modèles utilisés existent-ils encore ? ──
      if (slot === "matin") {
        try {
          const { VISION_MODEL, TEXT_MODEL } = require("./aiModels.cjs");
          const r = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } });
          if (!r.ok) throw new Error(`Clé Groq refusée (HTTP ${r.status})`);
          const ids = new Set(((await r.json()).data || []).map(m => m.id));
          const missing = [VISION_MODEL, TEXT_MODEL].filter(m => !ids.has(m));
          if (missing.length) throw new Error(`Modèle(s) retiré(s) par Groq : ${missing.join(", ")} — mettre à jour api/aiModels.cjs`);
        } catch (e) { await require("./alerting.cjs").reportServerError("IA Groq indisponible", e); }
      }

      // ── Signal de vie + contrôle : le soir, vérifier que la tâche du matin a tourné ──
      const alerting = require("./alerting.cjs");
      if (slot === "soir") {
        const matin = await alerting.getStatus("cron_matin");
        if (matin?.value?.date !== today) {
          await alerting.reportServerError("Tâche planifiée du matin non exécutée",
            new Error(`Aucune exécution du créneau matin le ${today} (dernière : ${matin?.value?.date || "jamais"})`));
        }
      }
      await alerting.setStatus(`cron_${slot}`, { date: today, at: new Date().toISOString(), pushSent, emailSent, emailFallbackSent, photosPurgees });

      console.log(`[CRON ${slot}] reminders:`, remindersData?.length || 0, "pushSent:", pushSent, "emailSent:", emailSent, "emailFallbackSent:", emailFallbackSent, "skipped:", skipped, "parcoursSent:", parcoursSent, "parcoursTermines:", parcoursTermines, "trialRelances:", trialRelances, "baselineSent:", baselineSent, "premiumOffertsExpires:", premiumOffertsExpires, "photosPurgees:", photosPurgees);
      return res.json({ success: true, date: today, slot, pushSent, emailSent, emailFallbackSent, skipped, parcoursSent, parcoursTermines, trialRelances, baselineSent, premiumOffertsExpires, photosPurgees, reminders: remindersData?.length || 0 });
    } catch (e) {
      await require("./alerting.cjs").reportServerError("Tâche planifiée en échec", e, { "Créneau": req.query.slot || "matin" });
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
      const userId = await require("./auth.cjs").verifiedUserId(req);
      if (!userId) return res.status(401).json({ error: "Token invalide", isGuest: false });

      const { createClient } = require("@supabase/supabase-js");
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const { data } = await supabase
        .from("user_access")
        .select("status, guest_until")
        .eq("user_id", userId)
        .maybeSingle();

      return res.json({ status: data?.status || null, isGuest: require("./premium.cjs").rowGuestActive(data) });
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
      const userId = await require("./auth.cjs").verifiedUserId(req);
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
          .update({ status: "guest", guest_code: gc.code, guest_until: gc.access_until || null, guest_label: gc.label || null, approved_at: nowIso, updated_at: nowIso })
          .eq("user_id", userId);
        writeErr = error;
      } else {
        const { error } = await supabase.from("user_access")
          .insert({ user_id: userId, status: "guest", guest_code: gc.code, guest_until: gc.access_until || null, guest_label: gc.label || null, approved_at: nowIso, updated_at: nowIso });
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
          body:    JSON.stringify({ public_metadata: { guestAccess: true, guestUntil: gc.access_until || null } }),
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
  // CUSTOMER-PORTAL — Lien Stripe Customer Portal (mention 10 avocat)
  // POST /api/send?type=customer-portal — Bearer Clerk obligatoire
  // ════════════════════════════════════════════════════════════════════════
  if (type === "customer-portal") {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token manquant" });
      }

      const userId = await require("./auth.cjs").verifiedUserId(req);

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
      const user = await require("./auth.cjs").getAuthUser(req);
      if (!user) return res.status(401).json({ error: "Authentification requise" });
      const userId = user.id; // identité vérifiée — jamais celle envoyée par le client
      const { subscription } = req.body || {};
      if (!subscription?.endpoint) throw new Error("Données manquantes");
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

  // ── ALERT — erreur remontée par l'application (usePilotage / ErrorBoundary) ──
  // Stockage error_events + email dédoublonné côté serveur (api/alerting.cjs).
  if (type === "alert") {
    const { kind, message, severity, path, userId, userAgent, details } = req.body || {};
    if (!kind || !message) return res.status(400).json({ error: "kind et message requis" });
    const { recordError } = require("./alerting.cjs");
    const r = await recordError({
      source: "client",
      severity: ["warning", "info"].includes(severity) ? severity : "error", // info = mesure, sans email
      kind, message, path, userId, userAgent, details,
    });
    return res.json({ success: true, ...r });
  }

  // ── ALERT-TEST — bouton « Tester l'alerte email » du Pilotage (admin) ──────
  if (type === "alert-test") {
    const { recordError } = require("./alerting.cjs");
    const { isAdminRequest } = require("./auth.cjs");
    if (!(await isAdminRequest(req))) return res.status(403).json({ error: "Accès admin uniquement" });
    const r = await recordError({
      source: "server", severity: "info", kind: "Test du système d'alerte",
      message: "Test manuel depuis le Pilotage — la chaîne d'alerte (base + email) fonctionne.",
      details: { "Déclencheur": "Pilotage → Services" },
    }, { forceEmail: true });
    return res.json({ success: r.emailed, ...r, ...(r.emailed ? {} : { error: "Email non envoyé (voir journaux Vercel)" }) });
  }

  // ── NOTIFICATION-TEST — confirmation après activation (sur l'abonnement de l'appelant) ──
  if (type === "notification-test") {
    try {
      const user = await require("./auth.cjs").getAuthUser(req);
      if (!user) return res.status(401).json({ error: "Authentification requise" });
      const { createClient } = require("@supabase/supabase-js");
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const { data } = await supabase.from("push_subscriptions").select("subscription").eq("user_id", user.id).maybeSingle();
      if (!data?.subscription) return res.status(404).json({ error: "Aucun abonnement" });

      const webpush = require("web-push");
      webpush.setVapidDetails(process.env.VAPID_EMAIL || "mailto:contact@mongazon360.fr",
        process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
      await webpush.sendNotification(data.subscription, JSON.stringify({
        title: "🌿 Mongazon360", body: "C'est activé ! Bob t'enverra ses conseils ici.",
        icon: "/icon-192.png", tag: "test", url: "/", actionRoute: "/",
      }));
      return res.json({ success: true });
    } catch (e) {
      await require("./alerting.cjs").reportServerError("Notification de test en échec", e);
      return res.status(500).json({ error: e.message });
    }
  }

  // ── REMINDER (email) ──────────────────────────────────────────────────────
  if (type === "reminder") {
    try {
      const { reminders, userEmail, userName = "Jardinier", profile = {} } = req.body;
      if (!reminders?.length || !userEmail) throw new Error("Données manquantes");

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from:    "Mongazon360 <bonjour@mongazon360.fr>",
          to:      [userEmail],
          subject: `🌿 [Mongazon360®] Rappel : ${reminders.map(r => r.label).join(", ")}`,
          html:    buildReminderHtml(reminders, userName, profile),
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

  // ── PARCOURS (Création / Regarnissage) — expose le moteur au front ────────
  // ?type=parcours-cansow : analyse de fenêtre (canSow) — lecture seule, aucun écrit
  if (type === "parcours-cansow") {
    try {
      const { canSow } = require("./parcoursEngine.cjs");
      const { lat, lon, zoneKey, soilTemp, month, dateSemis, soilTempSource } = req.body || {};
      const verdict = canSow({ lat, lon, zoneKey, soilTemp, month, dateSemis, soilTempSource });
      return res.json({ success: true, verdict });
    } catch (e) {
      console.error("parcours-cansow:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  // ?type=parcours-schedule : échéancier des 6 phases (buildSchedule) — lecture seule
  if (type === "parcours-schedule") {
    try {
      const { buildSchedule } = require("./parcoursEngine.cjs");
      const { parcoursType, dateSemis } = req.body || {};
      const schedule = buildSchedule({ type: parcoursType, dateSemis });
      return res.json({ success: true, schedule });
    } catch (e) {
      console.error("parcours-schedule:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  // ?type=parcours-current : phase courante + blocages (currentPhase) — lecture seule
  if (type === "parcours-current") {
    try {
      const { currentPhase } = require("./parcoursEngine.cjs");
      const { parcoursType, dateSemis, today } = req.body || {};
      const state = currentPhase({ type: parcoursType, dateSemis, today });
      return res.json({ success: true, state });
    } catch (e) {
      console.error("parcours-current:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: "Type requis : ?type=alert|notification-test|reminder|parcours-cansow|parcours-schedule|parcours-current" });
};
