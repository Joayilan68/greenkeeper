// api/notifOpen.cjs
// Mesure des ouvertures de notifications et des clics des emails : chaque envoi porte un jeton signé
// (compte, date, type). Au clic, le service worker (notification) ou l'app (lien d'email, paramètre m)
// le renvoie à /api/send?type=notif-open, qui marque l'envoi « ouvert » ou « clic » dans
// reminders.notif_log. Le jeton ne contient aucune donnée sensible et ne peut pas être fabriqué sans
// la clé serveur.

const crypto = require("crypto");

const cle = () => crypto.createHash("sha256").update(`notif-open:${process.env.VAPID_PRIVATE_KEY || ""}`).digest();
const signature = (charge) => crypto.createHmac("sha256", cle()).update(charge).digest("base64url").slice(0, 22);

function jetonOuverture(userId, date, type) {
  const charge = `${userId}.${date}.${type}`;
  return `${charge}.${signature(charge)}`;
}

// Renvoie { userId, date, type } si le jeton est authentique, sinon null
function lireJeton(jeton) {
  const parts = String(jeton || "").split(".");
  if (parts.length !== 4) return null;
  const [userId, date, type, sig] = parts;
  const attendu = signature(`${userId}.${date}.${type}`);
  if (sig.length !== attendu.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(attendu))) return null;
  return { userId, date, type };
}

module.exports = { jetonOuverture, lireJeton };
