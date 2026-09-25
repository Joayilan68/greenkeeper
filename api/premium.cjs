// api/premium.cjs
// Premium offert (famille, bêta-testeurs…) — règle unique côté serveur.
// Deux sources, toutes deux écrites uniquement par le serveur :
//   - Clerk publicMetadata : guestAccess (true) + guestUntil ("AAAA-MM-JJ", absent = à vie)
//   - Supabase user_access : status "guest" + guest_until (null = à vie)
// La date de fin est incluse (accès jusqu'au soir du jour indiqué, heure de Paris).

const todayParis = () => new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });

const stillValid = (until) => !until || String(until).slice(0, 10) >= todayParis();

// Accès offert encore valide d'après les métadonnées Clerk (publicMetadata ou public_metadata)
function clerkGuestActive(publicMetadata) {
  const pm = publicMetadata || {};
  return pm.guestAccess === true && stillValid(pm.guestUntil);
}

// Accès offert encore valide d'après une ligne user_access
function rowGuestActive(row) {
  return row?.status === "guest" && stillValid(row.guest_until);
}

// Vérité complète : Clerk d'abord (sans requête), sinon user_access
async function isGuestUser(userId, publicMetadata) {
  if (clerkGuestActive(publicMetadata)) return true;
  try {
    const { createClient } = require("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
    const { data } = await sb.from("user_access").select("status, guest_until").eq("user_id", userId).maybeSingle();
    return rowGuestActive(data);
  } catch (e) {
    console.warn("[premium] lecture user_access :", e.message);
    return false;
  }
}

module.exports = { todayParis, clerkGuestActive, rowGuestActive, isGuestUser };
