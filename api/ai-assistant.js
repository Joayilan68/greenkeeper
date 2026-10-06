// api/ai-assistant.js
// Assistant IA gazon « Bob » — Groq (modèle : aiModels.cjs) avec contexte personnalisé

const { createClerkClient } = require("@clerk/backend");
const { verifiedUserId, ADMIN_EMAILS } = require("./auth.cjs");
const { isGuestUser } = require("./premium.cjs");
const { buildBobContext } = require("./bobContext.cjs");

// Articles « Conseils gazon » et catalogue Amazon (publiés au build : /conseils.json, /produits.json),
// gardés 1 h en mémoire
const publies = {};
async function publie(fichier, vide) {
  const c = publies[fichier];
  if (c && Date.now() - c.at < 3600e3) return c.data;
  try {
    const base = process.env.SELF_BASE_URL || "https://mongazon360.fr";
    const r = await fetch(`${base}/${fichier}`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) publies[fichier] = { at: Date.now(), data: await r.json() };
  } catch (e) { console.warn(`[bob] ${fichier} :`, e.message); }
  return publies[fichier]?.data || vide;
}

// Le catalogue (~800 jetons) n'est joint que si la question parle d'achat ou de produit
const QUESTION_PRODUIT = /achet|produit|mat[ée]riel|marque|prix|combien co[uû]te|budget|recommand|conseill.*(quel|lequel)|quel(le)?s? .*(choisir|prendre|utiliser)/i;
// Catégories du catalogue jointes selon la question (moins de jetons) ; question d'achat générale → catalogue complet
const CATEGORIES_PRODUIT = [
  [/engrais|nourri|jaun|carenc|p[aâ]le/i, ["engraisStarter", "engraisEte", "engraisAutomne", "engraisHiver"]],
  [/semence|graine|regarn|sem(er|is)|trou|clairsem|pel[ée]e/i, ["regarnissage"]],
  [/mousse/i, ["antiMousse"]],
  [/d[ée]sherb|mauvaise.? herbe|pissenlit|plantain|tr[eè]fle/i, ["desherbage"]],
  [/a[ée]r(er|ation|ateur)|carott|tass|compact/i, ["aeration"]],
  [/scarif|verticut|feutre/i, ["verticut"]],
  [/tond|tonte/i, ["tonte"]],
  [/biostimul|stress|reprise/i, ["biostimulant"]],
];

const prix = (n) => `${Number(n).toFixed(2).replace(".", ",")} €`;

// [[produit:cle:gamme]] écrit par Bob → lien affilié Amazon (les jetons inconnus sont retirés)
function lierProduits(texte, produits) {
  return texte.replace(/\[\[produit:([a-zA-Z]+):([a-z]+)\]\]/g, (_, cle, tier) => {
    const p = produits[cle]?.tiers?.[tier];
    return p ? `[🛒 ${p.label} (${p.marque}, ~${prix(p.prix)})](${p.url})` : "";
  });
}
const { createClient }      = require("@supabase/supabase-js");

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  // ✅ AUTH — token Clerk obligatoire
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant" });
  }

  const clerkUserId = await verifiedUserId(req);
  if (!clerkUserId) {
    return res.status(401).json({ error: "Token invalide" });
  }

  // ✅ QUOTA — compté en base (fonction bob_consume : verrou par compte, périodes à l'heure de Paris)
  //   Premium / essai / Premium offert : 20 questions par jour · Gratuit : 3 par mois · Admin : illimité
  const QUOTAS = {
    paid: { endpoint: "bob",      period: "day",   limit: 20 },
    free: { endpoint: "bob_free", period: "month", limit: 3 },
  };
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
  let quota, consumed = null, premium = false;
  try {
    const clerkUser  = await clerk.users.getUser(clerkUserId);
    const userEmail  = clerkUser.emailAddresses?.[0]?.emailAddress || "";
    const isAdmin    = ADMIN_EMAILS.includes(userEmail) || clerkUser.publicMetadata?.role === "admin";
    // Essai gratuit 7 jours à partir de la création du compte (règle unique api/premium.cjs)
    const isTrial    = require("./premium.cjs").essaiActif(clerkUser.createdAt);
    const isPremium  = clerkUser.publicMetadata?.isSubscribed === true ||
                       clerkUser.publicMetadata?.subscriptionStatus === "active" ||
                       clerkUser.publicMetadata?.subscriptionStatus === "trialing" ||
                       isTrial || await isGuestUser(clerkUserId, clerkUser.publicMetadata);
    premium = isAdmin || isPremium;
    quota = isAdmin ? null : isPremium ? QUOTAS.paid : QUOTAS.free;

    // Consultation du solde (affichage dans l'app), sans consommer
    if (req.body?.action === "quota") {
      if (!quota) return res.json({ unlimited: true });
      const { data: used, error } = await supabase.rpc("bob_usage",
        { p_user: clerkUserId, p_endpoint: quota.endpoint, p_period: quota.period });
      if (error) throw new Error(error.message);
      return res.json({ remaining: Math.max(0, quota.limit - used), limit: quota.limit, period: quota.period });
    }

    if (quota) {
      const { data, error } = await supabase.rpc("bob_consume",
        { p_user: clerkUserId, p_endpoint: quota.endpoint, p_period: quota.period, p_limit: quota.limit });
      if (error) throw new Error(error.message);
      if (!data?.[0]?.allowed) {
        return res.status(429).json({
          remaining: 0, limit: quota.limit, period: quota.period,
          error: quota.period === "day"
            ? `Tu as posé tes ${quota.limit} questions du jour. Bob te retrouve demain ! 🌿`
            : `Tu as utilisé tes ${quota.limit} questions gratuites du mois. Avec Premium, Bob répond à ${QUOTAS.paid.limit} questions par jour.`,
        });
      }
      consumed = data[0];
    }
  } catch (e) {
    // Quota invérifiable → on refuse plutôt que de laisser passer sans limite
    await require("./alerting.cjs").reportServerError("Assistant IA Bob — quota indisponible", e);
    return res.status(503).json({ error: "Bob est momentanément indisponible. Réessaie dans quelques minutes." });
  }

  try {
    const { profile = {}, score = 0, month = 1 } = req.body;
    // Seuls les derniers échanges sont transmis (coût et pertinence maîtrisés)
    const messages = (req.body.messages || []).slice(-10)
      .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
    if (!messages.length) throw new Error("Messages manquants");

    // Dossier de l'utilisateur construit côté serveur (profil, actions, diagnostic, parcours, météo 5 jours)
    const question = messages.filter(m => m.role === "user").slice(-1)[0]?.content || "";
    const cles = [...new Set(CATEGORIES_PRODUIT.filter(([re]) => re.test(question)).flatMap(([, c]) => c))];
    const categories = cles.length || !QUESTION_PRODUIT.test(question) ? cles : null; // null = catalogue complet
    const questionProduit = !categories || categories.length > 0;
    const [articles, catalogue] = await Promise.all([publie("conseils.json", []), questionProduit ? publie("produits.json", {}) : {}]);
    const produits = categories ? Object.fromEntries(Object.entries(catalogue).filter(([cle]) => categories.includes(cle))) : catalogue;
    let contexte;
    try {
      contexte = await buildBobContext(supabase, { userId: clerkUserId, premium, clientProfile: profile, score, month });
    } catch (e) {
      console.warn("[bob] contexte partiel :", e.message);
      contexte = `- Score de santé : ${score}/100 · profil : ${JSON.stringify(profile).slice(0, 400)}`;
    }

    const systemPrompt = `Tu es Bob, l'assistant expert en gazon et pelouses de l'application Mongazon360®.
Tu es passionné, bienveillant et très compétent en agronomie du gazon et en jardinage.

CE QUE L'APP SAIT DE L'UTILISATEUR (utilise-le pour personnaliser, sans le réciter) :
${contexte}

CE QUE L'APP MONGAZON360 PERMET RÉELLEMENT (ne cite QUE ces fonctions, n'en invente JAMAIS d'autre ;
si une fonction n'existe pas, dis simplement que ce n'est pas encore possible) :
- Tableau de bord : score de santé du gazon, météo du jour, alertes météo ; du 1er novembre à la 1re tonte, compte
  à rebours du printemps (dates indicatives de sa zone : révision de la tondeuse, 1re tonte, scarification, regarnissage)
  qui ouvre le plan de printemps (calendrier complet de sa zone et liste d'achats pour sa surface, liens Amazon,
  à cocher « acheté » ou « j'en ai déjà », comparée à son budget) ;
  du 15 novembre à fin février, bilan de saison (actions de l'année, badges, image à partager).
- Onglet « Aujourd'hui » : les actions du jour proposées selon la météo (tonte, arrosage, engrais…), à valider
  une fois faites (elles vont dans l'historique, à la date du jour) ; minuteur d'arrosage.
- Onglet « Diagnostic » : diagnostic photo de la pelouse par Bob.
- Onglet « Mon Gazon » : profil du gazon, score détaillé, historique des actions ; « Mon plan gazon » : plan annuel
  personnalisé (12 mois d'entretien selon sa zone, son sol, son gazon et son équipement), achat unique à 0,99 €, en PDF.
- « Mes équipements » (depuis Mon Gazon) : connexion d'une station météo Ecowitt (clés créées par l'utilisateur sur
  ecowitt.net) ; la pluie tombée, la température et le vent mesurés au jardin remplacent les prévisions pour la journée
  (arrosage, tonte, gel, notifications). Connexion d'un robot Husqvarna Automower : état du robot, et dans « Aujourd'hui »
  proposition de le mettre au repos (pluie, gel, vent, semis en cours, avant la 1re tonte, hors saison) ou de relancer son
  planning, envoyée au robot seulement si l'utilisateur valide. Connexion d'un arrosage Gardena ou Rachio : dans « Aujourd'hui »,
  proposition d'arroser chaque zone à la dose du jour (le matin seulement), de suspendre les programmes quand la pluie suffit
  ou de mettre en veille l'hiver, envoyée seulement si l'utilisateur valide. Autres marques et caméras : pas encore disponibles.
- Parcours guidés « Création de gazon » et « Regarnissage » : fenêtre de semis selon la température du sol, étapes
  et arrosages jour par jour.
- Notifications (ou emails) de conseils, jusqu'à 2 par jour ; alertes gel et canicule ; travaux d'hiver (feuilles,
  dernière tonte, purge de l'arrosage, pH du sol, hivernage de la tondeuse ou du robot) et reprise du printemps (plan de printemps prêt, révision de la
  tondeuse, 1re tonte).
- Onglet « Produits » : kit de la saison en cours (produits utiles, quantités pour sa surface, gamme selon son
  budget, noté en un clic dans ses dépenses ; en hiver, lien vers la liste d'achats du printemps), produits recommandés, et suivi des dépenses de l'année (achats notés par l'utilisateur,
  comparés à son budget, remis à zéro le 1er janvier ; chaque achat est gardé avec son prix, détaillé dans son
  dossier ci-dessous) ; onglet « Classement » : GreenPoints et ligues.
- Arrosage calculé au millimètre selon l'évaporation et la pluie (Premium).
- Rubrique « Conseils gazon » sur mongazon360.fr/conseils : 18 guides saison par saison.
L'app ne permet PAS de planifier des actions futures, de piloter un programmateur ou un robot, ni de commander
des produits.

ARTICLES « CONSEILS GAZON » DE MONGAZON360 :
${articles.map(a => `- ${a.title} — https://mongazon360.fr/conseils/${a.slug}`).join("\n") || "- (liste indisponible)"}
Quand un de ces articles correspond directement à la question, termine ta réponse par UNE seule ligne :
« 👉 Pour aller plus loin : [titre de l'article](adresse exacte ci-dessus) ». Jamais plus d'un lien, jamais
d'autre adresse que celles de cette liste, et aucun lien si aucun article ne correspond vraiment.

${questionProduit ? `PRODUITS RECOMMANDABLES (catalogue partenaire Amazon — gamme : eco, standard, qualite, premium) :
${Object.entries(produits).map(([cle, c]) => `- ${cle} (${c.label}) : ` + Object.entries(c.tiers).map(([t, p]) => `${t} = ${p.label}, ${p.marque}, ${prix(p.prix)}`).join(" | ")).join("\n") || "- (catalogue indisponible)"}
Règles produits : propose un produit quand l'utilisateur demande quoi acheter ou quand ton conseil en demande un
pour être appliqué (engrais de saison, semences, anti-mousse…), jamais pour une action qui n'en a pas besoin ;
2 produits maximum ; choisis la gamme conseillée par son budget et tiens compte du budget restant indiqué dans son
dossier : s'il est dépassé ou presque, propose d'abord une solution sans achat ou l'entrée de gamme, et dis-le
simplement. Après un produit cité, ajoute une courte phrase : il peut le noter avec « Je l'ai acheté » dans
l'onglet Produits pour suivre son budget. Si son objectif est naturel, uniquement des produits organiques,
minéraux naturels, semences ou outils. Pour citer un produit, écris exactement le jeton [[produit:cle:gamme]]
(ex. [[produit:engraisAutomne:standard]]) : l'app le transforme en lien. N'écris jamais d'adresse Amazon toi-même. Ne recommande jamais de désherbant chimique
(interdit aux particuliers depuis 2019).

` : "Ne recommande aucun produit précis dans cette réponse (pas de catalogue joint).\n\n"}PRINCIPES DE BOB :
1. Expert nuancé, pas dogmatique : donne la meilleure pratique ET explique pourquoi. Accepte les alternatives
   réalistes quand l'utilisateur a une contrainte, sans contredire les règles Mongazon360 (ex. : arroser tôt le
   matin ; si c'est impossible, un programmateur permet de le faire sans être présent ; le soir reste déconseillé,
   et interdit en sol argileux ou compacté).
2. Des repères, pas des chiffres gravés dans le marbre : hauteurs de tonte, doses, fréquences d'arrosage sont des
   fourchettes à adapter à la saison, au sol, à l'ombre, à l'usage et à la météo. Utilise en priorité les repères
   Mongazon360 de son dossier (hauteurs de tonte de son gazon, arrosage de son sol). À défaut : gazon universel 5-6 cm
   au printemps et en automne, 6-7 cm en été, 7-8 cm en canicule, jamais plus d'un tiers de la hauteur par tonte ;
   arrosage en profondeur 2 à 3 fois par semaine plutôt qu'un peu chaque jour.
3. Objectif « naturel » respecté sans dogme : si l'objectif de l'utilisateur est naturel, privilégie les solutions
   naturelles et organiques ; présente les autres options seulement s'il les demande, en expliquant les différences.
   Rappel : les pesticides de synthèse sont interdits aux particuliers en France depuis 2019 (loi Labbé).
4. Tout le jardin, avec le gazon en priorité : tu peux répondre sur ce qui entoure la pelouse (haies, arbres,
   massifs, potager voisin, robot tondeuse, arrosage automatique, nuisibles, outils, météo). Refuse poliment
   uniquement ce qui n'a aucun rapport avec le jardin.
5. Longueur adaptée à la question : court pour une question simple ; étapes numérotées pour un « comment faire ».
6. Appuie-toi sur ce que l'app sait (profil, zone climatique et son calendrier, météo, score ci-dessus) et reste
   cohérent avec l'app Mongazon360 (plan d'entretien, alertes, diagnostic photo par Bob, parcours semis/regarnissage guidés). Si la situation
   réelle de l'utilisateur diffère de ce que l'app suppose, dis-le et explique.
7. Honnête et prudent : dis quand tu ne sais pas ou quand une photo aiderait (propose le diagnostic photo de
   l'app) ; oriente vers un professionnel si nécessaire ; rappelle de respecter l'étiquette des produits.

STYLE :
- Réponds toujours en français, en TUTOYANT l'utilisateur, avec un ton chaleureux et direct.
- Des conseils concrets et actionnables, adaptés au profil et à la saison.
- Emojis avec parcimonie.
- Slogan de l'app : "Tant qu'il y a gazon, il y a match" 🌿`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model:                 require("./aiModels.cjs").TEXT_MODEL,
        max_completion_tokens: 900,
        temperature:           0.7,
        // gpt-oss est un modèle de raisonnement : sans ces réglages, il peut
        // renvoyer son raisonnement interne dans la réponse. On le désactive
        // pour que Bob ne renvoie QUE sa réponse finale.
        reasoning_effort:  "low",   // raisonnement minimal (réponses simples + rapides)
        include_reasoning: false,   // ne pas inclure le raisonnement dans la réponse
        messages: [
          { role:"system", content: systemPrompt },
          ...messages
        ]
      })
    });

    const data = await groqRes.json();
    if (data.error) throw new Error("Groq: " + (data.error.message || JSON.stringify(data.error)));

    const reply = lierProduits(data.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu générer une réponse.", produits);
    res.json({ success:true, reply, ...(consumed ? { remaining: consumed.remaining, limit: quota.limit, period: quota.period } : {}) });

  } catch (e) {
    // Réponse non fournie → la question est rendue
    if (consumed?.row_id) await supabase.from("rate_limits").delete().eq("id", consumed.row_id);
    await require("./alerting.cjs").reportServerError("Assistant IA Bob en échec", e);
    res.status(500).json({ error: e.message });
  }
};
