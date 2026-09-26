// api/relances.cjs
// Relance des inscrits qui ne viennent plus dans l'app (tâche du matin, api/send.js) :
// 3 messages au plus par absence, à J+7, J+21 et J+45 sans visite (J+21 et J+45 de novembre à
// février, où le gazon demande peu), puis silence jusqu'au retour. Historique dans Clerk,
// private_metadata.relances (6 dernières) : { p: palier, at: AAAA-MM-JJ, canal, retour? },
// qui sert aussi au taux de retour de Pilotage.

const JOUR = 86400000;
const SEUILS = [7, 21, 45];
const RETOUR_JOURS = 7; // une visite dans les 7 jours qui suivent la relance = retour
const moisCreux = (month) => month >= 11 || month <= 2;

const derniereVisite = (u) => u.last_active_at || u.last_sign_in_at || u.created_at || null;
const historique = (u) => Array.isArray(u.private_metadata?.relances) ? u.private_metadata.relances : [];
// Comparaisons au jour près (AAAA-MM-JJ) : Clerk peut arrondir last_active_at au jour
const jourDe = (ms) => new Date(ms).toISOString().slice(0, 10);
const estRevenu = (u, r) => r.retour === true || (!!u.last_active_at && jourDe(u.last_active_at) >= r.at
  && jourDe(u.last_active_at) <= jourDe(Date.parse(r.at) + RETOUR_JOURS * JOUR));

// Fige les retours constatés (la visite suivante effacerait last_active_at) : historique à
// réenregistrer, ou null si rien de nouveau
function marquerRetours(u) {
  const h = historique(u);
  if (!h.some(r => !r.retour && estRevenu(u, r))) return null;
  return h.map(r => !r.retour && estRevenu(u, r) ? { ...r, retour: true } : r);
}

// Palier dû aujourd'hui (1 à 3) ou null. Un seul message même si plusieurs seuils sont franchis.
function palierDu(u, now = Date.now(), month = new Date(now).getMonth() + 1) {
  const visite = derniereVisite(u);
  if (!visite) return null;
  const jours = Math.floor((now - visite) / JOUR);
  const palier = SEUILS.filter(s => jours >= s).length;
  if (!palier || (moisCreux(month) && jours < SEUILS[1])) return null;
  // Relances de l'absence en cours = envoyées après la dernière visite
  const dejaEnvoye = Math.max(0, ...historique(u).filter(r => r.at > jourDe(visite)).map(r => r.p));
  return palier > dejaEnvoye ? palier : null;
}

const sansEmoji = (t) => String(t).replace(/^[\p{Extended_Pictographic}\uFE0F\s]+/u, "");

// Texte du message : action du moteur de notifications (sinon conseil du jour) si le profil est
// rempli, invitation à le compléter sinon
function messageRelance(palier, { ville, action, conseil, profilComplet }) {
  if (!profilComplet) return {
    title: "⏱️ 2 minutes pour ton plan d'entretien",
    body: "Décris ton gazon (type, sol, commune) : Mongazon360 te prépare un plan mois par mois, calé sur ta météo.",
    url: "/setup",
  };
  const chez = ville ? ` à ${ville}` : "";
  if (palier === 1) return {
    title: action ? `🌿 Cette semaine${chez} : ${sansEmoji(action.title)}` : `🌿 Ton gazon${chez} cette semaine`,
    body: `${action ? action.body : conseil.body} Ton plan d'entretien t'attend dans l'app.`,
    url: "/today",
  };
  if (palier === 2) return {
    title: "📋 Ton gazon a avancé sans toi",
    body: `3 semaines sans visite. ${action ? `L'essentiel maintenant : ${sansEmoji(action.title)} — ${action.body}` : `Le conseil de Bob : ${conseil.body}`}`,
    url: "/today",
  };
  return {
    title: "👋 Ton gazon t'attend toujours",
    body: "Ton profil, ton historique et ton score sont gardés au chaud. C'est notre dernier rappel : reviens quand tu veux, ton plan se remet à jour avec la saison.",
    url: "/today",
  };
}

// Pilotage → Activité : inactifs par palier, relances des 30 derniers jours et retours
function statsRelances(users, now = Date.now()) {
  const inactifs = { j7: 0, j21: 0, j45: 0 };
  let envoyees = 0, mesurables = 0, retours = 0;
  const parCanal = { push: 0, email: 0 };
  for (const u of users) {
    const visite = derniereVisite(u);
    const jours = visite ? Math.floor((now - visite) / JOUR) : 0;
    if (jours >= 45) inactifs.j45++; else if (jours >= 21) inactifs.j21++; else if (jours >= 7) inactifs.j7++;
    for (const r of historique(u)) {
      const at = Date.parse(r.at);
      if (now - at > 30 * JOUR) continue;
      envoyees++;
      parCanal[r.canal] = (parCanal[r.canal] || 0) + 1;
      const revenu = estRevenu(u, r);
      if (revenu) retours++;
      if (revenu || now - at >= RETOUR_JOURS * JOUR) mesurables++;
    }
  }
  return { inactifs, envoyees, parCanal, mesurables, retours };
}

const ajouterRelance = (u, entree) => [...historique(u), entree].slice(-6);

module.exports = { palierDu, messageRelance, marquerRetours, ajouterRelance, statsRelances };
