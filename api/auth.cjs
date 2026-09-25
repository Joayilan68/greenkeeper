// api/auth.cjs
// Identification de l'appelant par son jeton Clerk (Authorization: Bearer <JWT>).
// La signature du jeton est vérifiée (clés publiques de l'instance Clerk) puis le compte est
// relu via l'API Clerk : un identifiant envoyé par le client n'est jamais cru sur parole.

const { verifyToken } = require("@clerk/backend");

const ADMIN_EMAILS = ["mongazon360@gmail.com", "jordankrebs1@gmail.com"];

// Renvoie l'identifiant Clerk de l'appelant (jeton signé et non expiré) ou null
async function verifiedUserId(req) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return null;
  try {
    const { sub } = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    return sub || null;
  } catch (e) {
    console.warn("[auth] jeton refusé :", e.message);
    return null;
  }
}

// Renvoie l'utilisateur Clerk { id, email, publicMetadata } ou null
async function getAuthUser(req) {
  try {
    const sub = await verifiedUserId(req);
    if (!sub) return null;
    const r = await fetch(`https://api.clerk.com/v1/users/${sub}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return {
      id: u.id,
      email: (u.email_addresses?.[0]?.email_address || "").toLowerCase(),
      publicMetadata: u.public_metadata || {},
    };
  } catch { return null; }
}

async function isAdminRequest(req) {
  const u = await getAuthUser(req);
  return !!u && (ADMIN_EMAILS.includes(u.email) || u.publicMetadata.role === "admin");
}

module.exports = { verifiedUserId, getAuthUser, isAdminRequest, ADMIN_EMAILS };
