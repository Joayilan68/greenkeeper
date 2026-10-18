// api/reseaux.cjs
// Publication automatique des lots de comm sur la page Facebook et le compte Instagram de Mongazon360 (Graph API de Meta).
// Table publications (accès serveur uniquement) : lot préparé chaque samedi pour la semaine suivante, validé par Jordan
// dans Pilotage → Réseaux (api/stats.js ?type=publications), publié le jour et à l'heure prévus (heure de Paris) : appel de
// api/send.js ?type=publications toutes les 15 min par pg_cron (Supabase PROD), tâches planifiées de Vercel en secours.
// Clé META_PAGE_TOKEN (Vercel) : jeton d'un utilisateur système du portefeuille business, sans expiration (ou jeton de la
// page) ; le compte Instagram professionnel est celui relié à la page. Visuels JPEG publics (public/images/reseaux), lus
// par Meta au moment de publier.

const META = "https://graph.facebook.com/v26.0";
const IMAGE_TEST = "https://mongazon360.fr/images/conseils/regarnissage-avant-apres.jpg";
const pause = (ms) => new Promise(r => setTimeout(r, ms));
const jourParis = (ms = Date.now()) => new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
const heureParis = (ms = Date.now()) => new Date(ms).toLocaleTimeString("sv-SE", { timeZone: "Europe/Paris" });

async function appelMeta(chemin, params = {}, methode = "GET", jeton = process.env.META_PAGE_TOKEN) {
  if (!jeton) throw new Error("Connexion Meta pas encore faite (clé META_PAGE_TOKEN absente)");
  const corps = new URLSearchParams({ ...params, access_token: jeton });
  const dansUrl = methode !== "POST";
  const r = await fetch(dansUrl ? `${META}/${chemin}?${corps}` : `${META}/${chemin}`, {
    method: methode, signal: AbortSignal.timeout(15000), ...(dansUrl ? {} : { body: corps }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(`Meta : ${d.error?.message || `erreur ${r.status}`}`);
  return d;
}

// Page Mongazon360, son jeton et le compte Instagram professionnel relié. Un utilisateur système (indépendant des sessions
// Facebook) obtient le jeton de la page à chaque passage ; une clé de page est utilisée telle quelle.
async function compteMeta() {
  const moi = await appelMeta("me", { fields: "id,name" });
  const champs = "instagram_business_account{id,username}";
  const instagram = (ig) => ({ instagramId: ig?.id || null, instagram: ig?.username || null });
  const pages = await appelMeta("me/accounts", { fields: `id,name,access_token,${champs}` })
    .then((d) => d.data || [], (e) => { if (/nonexisting field/.test(e.message)) return null; throw e; });
  if (!pages) {
    const d = await appelMeta("me", { fields: champs });
    return { pageId: moi.id, page: moi.name, jeton: process.env.META_PAGE_TOKEN, ...instagram(d.instagram_business_account) };
  }
  const page = pages.find((p) => /mongazon360/i.test(p.name));
  if (!page) throw new Error(`La page Mongazon360 n'est pas attribuée au compte « ${moi.name} » de la clé META_PAGE_TOKEN`);
  return { pageId: page.id, page: page.name, jeton: page.access_token, ...instagram(page.instagram_business_account) };
}

async function publierFacebook(compte, pub) {
  const d = await appelMeta(`${compte.pageId}/photos`, { url: pub.visuel, caption: pub.texte_facebook }, "POST", compte.jeton);
  return d.post_id || d.id;
}

// Conteneur créé à partir du visuel, puis publié quand Instagram l'a traité (quelques secondes pour une image)
async function conteneurInstagram(compte, image, legende) {
  if (!compte.instagramId) throw new Error("Aucun compte Instagram professionnel relié à la page Facebook");
  const { id } = await appelMeta(`${compte.instagramId}/media`, { image_url: image, caption: legende }, "POST", compte.jeton);
  for (let i = 0; i < 5; i++) {
    const { status_code } = await appelMeta(id, { fields: "status_code" }, "GET", compte.jeton);
    if (status_code === "FINISHED") return id;
    if (status_code === "ERROR" || status_code === "EXPIRED") throw new Error(`Instagram refuse le visuel (${status_code})`);
    await pause(3000);
  }
  throw new Error("Instagram n'a pas fini de traiter le visuel, nouvel essai au prochain créneau");
}

async function publierInstagram(compte, pub) {
  const creation = await conteneurInstagram(compte, pub.visuel, pub.texte_instagram);
  return (await appelMeta(`${compte.instagramId}/media_publish`, { creation_id: creation }, "POST", compte.jeton)).id;
}

// Une publication sur les deux réseaux ; chaque réseau publié est noté aussitôt, pour ne jamais le republier lors d'un
// nouvel essai (même si la tâche est coupée entre les deux)
async function publierUne(supabase, compte, pub) {
  const noter = (champs) => supabase.from("publications").update(champs).eq("id", pub.id);
  try {
    if (!pub.facebook_id) await noter({ facebook_id: await publierFacebook(compte, pub) });
    if (!pub.instagram_id) await noter({ instagram_id: await publierInstagram(compte, pub) });
    await noter({ statut: "publiee", erreur: null, publiee_le: new Date().toISOString() });
    return true;
  } catch (e) {
    await noter({ statut: "erreur", erreur: e.message.slice(0, 300) });
    await require("./alerting.cjs").reportServerError("Publication réseaux en échec", e, { "Publication": pub.titre, "Jour": pub.date_publication });
    return false;
  }
}

// Jour passé : une publication validée n'est plus publiée (texte daté), une publication pas validée est écartée, une
// publication restée en cours (exécution interrompue) est à vérifier
async function expirer(supabase, jour) {
  const table = () => supabase.from("publications");
  await table().update({ statut: "erreur", erreur: "Jour de publication passé : non publiée" }).eq("statut", "validee").lt("date_publication", jour);
  await table().update({ statut: "refusee", erreur: "Pas validée avant le jour prévu" }).eq("statut", "a_valider").lt("date_publication", jour);
  await table().update({ statut: "erreur", erreur: "Publication interrompue : vérifier la page et Instagram" }).eq("statut", "en_cours").lt("date_publication", jour);
}

// Publications validées du jour dont l'heure est passée (validée en retard : publiée au passage suivant). Chacune est
// réservée (statut en_cours) avant d'être publiée : deux appels simultanés ne la publient jamais deux fois.
async function publierDues(supabase, ms = Date.now()) {
  const jour = jourParis(ms);
  await expirer(supabase, jour);
  const { data, error } = await supabase.from("publications").select("*")
    .eq("statut", "validee").eq("date_publication", jour).lte("heure", heureParis(ms)).order("heure");
  if (error) throw error;
  if (!data?.length) return 0;
  const compte = await compteMeta();
  let n = 0;
  for (const pub of data) {
    const { data: prise, error: e } = await supabase.from("publications").update({ statut: "en_cours" })
      .eq("id", pub.id).eq("statut", "validee").select("id");
    if (e) throw e;
    if (prise?.length && await publierUne(supabase, compte, pub)) n++;
  }
  return n;
}

// Pilotage → Réseaux : publications des 14 derniers jours et à venir
async function listePublications(supabase) {
  await expirer(supabase, jourParis());
  const { data, error } = await supabase.from("publications").select("*")
    .gte("date_publication", jourParis(Date.now() - 14 * 86400000)).order("date_publication").order("heure");
  if (error) throw error;
  return data || [];
}

// Actions de Jordan : valider (une ou tout le lot), refuser, remettre à valider, nouvel essai d'une publication en erreur.
// Une publication dont le jour est passé ne peut plus être validée.
async function actionPublication(supabase, { action, id, lot }) {
  const table = () => supabase.from("publications");
  const verifier = ({ error }) => { if (error) throw error; };
  const jour = jourParis();
  const validee = { statut: "validee", erreur: null, validee_le: new Date().toISOString() };
  if (action === "valider") return verifier(await table().update(validee).eq("id", id).eq("statut", "a_valider").gte("date_publication", jour));
  if (action === "valider_lot") return verifier(await table().update(validee).eq("lot", lot).eq("statut", "a_valider").gte("date_publication", jour));
  if (action === "refuser") return verifier(await table().update({ statut: "refusee" }).eq("id", id).in("statut", ["a_valider", "validee", "erreur"]));
  if (action === "remettre") return verifier(await table().update({ statut: "a_valider", erreur: null, validee_le: null }).eq("id", id).in("statut", ["validee", "refusee"]).gte("date_publication", jour));
  if (action === "reessayer") {
    const { data: pub, error } = await table().select("*").eq("id", id).eq("statut", "erreur").maybeSingle();
    if (error) throw error;
    if (!pub) throw new Error("Publication introuvable ou pas en erreur");
    if (pub.date_publication < jour) throw new Error("Jour de publication passé : publie-la à la main si elle est encore d'actualité");
    if (pub.date_publication > jour) return verifier(await table().update({ statut: "validee", erreur: null }).eq("id", id));
    const compte = await compteMeta();
    const { data: prise, error: e } = await table().update({ statut: "en_cours", erreur: null }).eq("id", id).eq("statut", "erreur").select("id");
    if (e) throw e;
    if (!prise?.length) throw new Error("Publication déjà en cours");
    if (!await publierUne(supabase, compte, pub)) throw new Error("Nouvel essai en échec : voir le message de la publication");
    return;
  }
  throw new Error("Action inconnue");
}

// Test de la connexion : photo Facebook non publiée (supprimée aussitôt) et conteneur Instagram jamais publié ; seuls les
// noms de la page et du compte Instagram sont renvoyés à Pilotage (jamais le jeton)
async function testerMeta() {
  const compte = await compteMeta();
  const photo = await appelMeta(`${compte.pageId}/photos`, { url: IMAGE_TEST, caption: "Test de connexion Mongazon360", published: "false" }, "POST", compte.jeton);
  await appelMeta(photo.id, {}, "DELETE", compte.jeton).catch(() => {});
  if (compte.instagramId) await conteneurInstagram(compte, IMAGE_TEST, "Test de connexion Mongazon360");
  return { page: compte.page, instagram: compte.instagram };
}

module.exports = { compteMeta, publierDues, listePublications, actionPublication, testerMeta };
