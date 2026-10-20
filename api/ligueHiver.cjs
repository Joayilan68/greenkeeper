// api/ligueHiver.cjs
// Ligue d'hiver (src/lib/ligueHiver.json) : un défi et un quiz de 3 questions par semaine, du dimanche au samedi
// (heure de Paris), sans classement. Table ligue_hiver (serveur uniquement, RLS sans politique).
//   POST /api/send?type=ligue { action: "etat" | "defi" | "quiz", semaine, reponses } — jeton Clerk obligatoire
// Aussi : contexte des notifications (tâche du matin), statistiques et participant le plus assidu (Pilotage → Activité),
// suppression des participations le 1er août qui suit la saison (règlement, CGU 6 g).
// Hors production (STA, préversions), la ligue démarre à debutTest pour pouvoir la tester avant le 1er novembre.

const { createClient } = require("@supabase/supabase-js");
const { verifiedUserId, compteExclu } = require("./auth.cjs");
const L = require("../src/lib/ligueHiver.json");

const JOUR = 86400000;
const num = (jour) => Date.parse(`${jour}T00:00:00Z`) / JOUR;
const saisie = (n) => new Date(n * JOUR).toISOString().slice(0, 10);
const jourParis = (d = new Date()) => d.toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
const debut = () => (process.env.VERCEL_ENV === "production" ? L.debut : L.debutTest);

// Semaine de la ligue (1 à L.semaines) contenant ce jour « AAAA-MM-JJ », ou null
function semaineDe(jour) {
  const n = Math.floor((num(jour) - num(debut())) / 7) + 1;
  return n >= 1 && n <= L.semaines ? n : null;
}
const debutSemaine = (n) => saisie(num(debut()) + 7 * (n - 1));

// Participations de l'utilisateur pour la saison, telles que l'app les affiche
async function etat(supabase, userId, jour) {
  const { data, error } = await supabase.from("ligue_hiver")
    .select("semaine, defi_le, quiz_le, quiz_reponses, quiz_bonnes")
    .eq("user_id", userId).eq("saison", L.saison).order("semaine");
  if (error) throw new Error(error.message);
  const semaines = (data || []).map(r => ({
    semaine: r.semaine, defi: !!r.defi_le,
    quiz: r.quiz_le ? { reponses: r.quiz_reponses || [], bonnes: r.quiz_bonnes } : null,
  }));
  const n = semaineDe(jour);
  return {
    saison: L.saison, debut: debut(), semaine: n,
    statut: n ? "en_cours" : num(jour) < num(debut()) ? "avant" : "terminee",
    semaines,
    points: semaines.reduce((t, s) => t + (s.defi ? 1 : 0) + (s.quiz ? 1 : 0), 0),
    completes: semaines.filter(s => s.defi && s.quiz).length,
  };
}

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const userId = await verifiedUserId(req);
  if (!userId) return res.status(401).json({ error: "Connexion requise" });
  const body = req.body || {};
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const jour = jourParis();
    if (body.action === "defi" || body.action === "quiz") {
      const n = semaineDe(jour);
      if (!n || Number(body.semaine) !== n) return res.status(409).json({ error: "Cette semaine de la ligue est terminée : recharge la page." });
      const cle = { user_id: userId, saison: L.saison, semaine: n };
      const { data: ligne, error } = await supabase.from("ligue_hiver").select("defi_le, quiz_le").match(cle).maybeSingle();
      if (error) throw new Error(error.message);
      let maj = null;
      if (body.action === "defi" && !ligne?.defi_le) maj = { ...cle, defi_le: new Date().toISOString() };
      if (body.action === "quiz") {
        if (ligne?.quiz_le) return res.status(409).json({ error: "Tu as déjà répondu au quiz de cette semaine." });
        const quiz = L.programme[n - 1].quiz, rep = body.reponses;
        if (!Array.isArray(rep) || rep.length !== quiz.length
          || rep.some((r, i) => !Number.isInteger(r) || r < 0 || r >= quiz[i].choix.length)) {
          return res.status(400).json({ error: "Réponds aux 3 questions." });
        }
        maj = { ...cle, quiz_le: new Date().toISOString(), quiz_reponses: rep, quiz_bonnes: rep.filter((r, i) => r === quiz[i].bonne).length };
      }
      if (maj) {
        const { error: e } = await supabase.from("ligue_hiver").upsert(maj, { onConflict: "user_id,saison,semaine" });
        if (e) throw new Error(e.message);
      }
    } else if (body.action !== "etat") {
      return res.status(400).json({ error: "Action inconnue" });
    }
    return res.json(await etat(supabase, userId, jour));
  } catch (e) {
    await require("./alerting.cjs").reportServerError("Ligue d'hiver en échec", e, { "Utilisateur": userId, "Action": body.action || "—" });
    return res.status(500).json({ error: "Ligue d'hiver indisponible, réessaie dans un instant." });
  }
}

// Tâche du matin : réponses expliquées des semaines passées (astuces « Le savais-tu ? ») et, par utilisateur, la semaine
// en cours avec le défi et le quiz déjà faits ou non (contexte ligue du moteur de notifications). null hors de la ligue.
async function contexteNotifications(supabase, jour) {
  const n = semaineDe(jour);
  if (!n) return null;
  const { data, error } = await supabase.from("ligue_hiver").select("user_id, defi_le, quiz_le")
    .eq("saison", L.saison).eq("semaine", n);
  if (error) throw new Error(error.message);
  const faits = {};
  for (const r of data || []) faits[r.user_id] = { defi: !!r.defi_le, quiz: !!r.quiz_le };
  const astuces = L.programme.slice(0, n - 1).flatMap(s => s.quiz.map(q => ({ title: "📚 Le savais-tu ?", body: q.explication })));
  const commun = { semaine: n, debutSemaine: debutSemaine(n), programme: L.programme[n - 1], points: L.points, astuces };
  return { astuces, pour: (userId) => ({ ...commun, defi: false, quiz: false, ...faits[userId] }) };
}

// Participations supprimées le 1er août qui suit la fin de la saison (saisons « AAAA-AAAA »)
async function purgerSaisonsTerminees(supabase, jour) {
  const annee = Number(jour.slice(0, 4)) - (Number(jour.slice(5, 7)) >= 8 ? 0 : 1);
  const { error } = await supabase.from("ligue_hiver").delete().lte("saison", `${annee - 1}-${annee}`);
  if (error) throw new Error(error.message);
}

// Pilotage → Activité : participation par semaine et participants les plus assidus (1 point par défi et par quiz),
// sans les comptes exclus du règlement (admins, comptes de test)
async function statsPilotage(supabase) {
  const { data, error } = await supabase.from("ligue_hiver")
    .select("user_id, semaine, defi_le, quiz_le, quiz_bonnes").eq("saison", L.saison);
  if (error) throw new Error(error.message);
  const ids = [...new Set((data || []).map(r => r.user_id))];
  const comptes = {};
  for (let i = 0; i < ids.length; i += 100) {
    const q = ids.slice(i, i + 100).map(id => `user_id=${encodeURIComponent(id)}`).join("&");
    const r = await fetch(`https://api.clerk.com/v1/users?limit=100&${q}`, { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } });
    if (!r.ok) throw new Error(`Clerk : comptes des participants refusés (HTTP ${r.status})`);
    for (const u of await r.json()) comptes[u.id] = u;
  }
  const lignes = (data || []).filter(r => comptes[r.user_id] && !compteExclu(comptes[r.user_id]));
  const semaines = L.programme.map((s, i) => {
    const l = lignes.filter(r => r.semaine === i + 1), q = l.filter(r => r.quiz_le);
    return { semaine: i + 1, debut: debutSemaine(i + 1), theme: s.theme, defis: l.filter(r => r.defi_le).length, quiz: q.length,
      bonnes: q.length ? Math.round(q.reduce((t, r) => t + r.quiz_bonnes, 0) / q.length * 10) / 10 : null };
  });
  const parUser = {};
  for (const r of lignes) {
    const p = parUser[r.user_id] ||= { points: 0, completes: 0, bonnes: 0 };
    p.points += (r.defi_le ? 1 : 0) + (r.quiz_le ? 1 : 0);
    p.completes += r.defi_le && r.quiz_le ? 1 : 0;
    p.bonnes += r.quiz_bonnes || 0;
  }
  const classes = Object.entries(parUser).sort((a, b) => b[1].points - a[1].points);
  const max = classes[0]?.[1].points || 0;
  const email = (u) => u.email_addresses?.find(e => e.id === u.primary_email_address_id)?.email_address || u.email_addresses?.[0]?.email_address || "";
  return {
    saison: L.saison, debut: debut(), semaine: semaineDe(jourParis()), semaines,
    participants: classes.length, badge: classes.filter(([, p]) => p.completes >= L.badge.semainesMin).length,
    max, exAequo: classes.filter(([, p]) => p.points === max && max > 0).length,
    premiers: classes.slice(0, 10).map(([id, p]) => ({ prenom: comptes[id].first_name || "", email: email(comptes[id]), ...p })),
  };
}

module.exports = { handler, contexteNotifications, purgerSaisonsTerminees, statsPilotage, semaineDe, jourParis };
