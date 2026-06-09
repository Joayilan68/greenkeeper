// src/components/ComingSoon.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, useClerk } from "@clerk/clerk-react";
import { supabase } from "../lib/supabase";
import { getCapturedUTM } from "../lib/useUTMCapture";

const C = {
  deepGreen:  "#2d6a4f",
  freshGreen: "#52b788",
  lightGreen: "#95d5b2",
  orange:     "#f4a261",
  bg:         "#0f2419",
  bgCard:     "rgba(255,255,255,0.05)",
  border:     "rgba(149,213,178,0.18)",
  text:       "#e8f5e9",
  textSoft:   "#95d5b2",
  textMuted:  "#4a7c5c",
};

const ADMIN_EMAILS = ["mongazon360@gmail.com", "jordankrebs1@gmail.com"];

// ✅ FIX 26/05/2026 — helper localStorage défensif
// Détecte les navigateurs qui bloquent silencieusement le storage
// (Safari iOS navigation privée, Brave strict, cookies tiers bloqués...)
function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    // Vérifier que l'écriture a réellement été persistée
    if (localStorage.getItem(key) !== value) {
      console.warn(`[MG360] localStorage non persisté pour la clé "${key}"`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`[MG360] localStorage bloqué pour "${key}":`, e.message);
    return false;
  }
}

function safeRemoveItem(key) {
  try { localStorage.removeItem(key); return true; }
  catch { return false; }
}

// ✅ Test global de persistance localStorage
function isLocalStorageAvailable() {
  try {
    const testKey = "__mg360_test__";
    localStorage.setItem(testKey, "1");
    const ok = localStorage.getItem(testKey) === "1";
    localStorage.removeItem(testKey);
    return ok;
  } catch {
    return false;
  }
}

export default function ComingSoon() {
  const navigate    = useNavigate();
  const { user }    = useUser();
  const { signOut } = useClerk();

  // ✅ FIX 26/05/2026 — détection navigateur restrictif au montage
  const [storageBlocked, setStorageBlocked] = useState(false);
  useEffect(() => {
    if (!isLocalStorageAvailable()) {
      setStorageBlocked(true);
      console.warn("[MG360] localStorage non disponible — navigateur restrictif ou mode privé");
    }
  }, []);

  // Auto-redirect admin — ne jamais bloquer un admin sur ComingSoon
  useEffect(() => {
    if (!user) return;
    const email = user.primaryEmailAddress?.emailAddress || "";
    if (ADMIN_EMAILS.includes(email) || user.publicMetadata?.role === "admin") {
      safeSetItem("mg360_approved",       "true");
      safeSetItem("gk_admin_code",         "GREENKEEPER2024");
      safeSetItem("mg360_onboarding_done", "true");
      safeRemoveItem("mg360_waitlist");
      // ✅ FIX : reload propre pour garantir que useAccessCheck reprend l'état frais
      window.location.href = "/";
    }
  }, [user]);

  // ════════════════════════════════════════════════════════════════════════
  // ✅ AUTO-INSERT PREINSCRIPTIONS (fix audit Clerk vs Supabase — juin 2026)
  // ════════════════════════════════════════════════════════════════════════
  // Tout user Clerk qui arrive sur ComingSoon (= non admin, non guest, non Premium)
  // est automatiquement ajouté à la table `preinscriptions` Supabase s'il n'y est
  // pas déjà. Cela garantit qu'au moment du lancement public, TOUS les comptes
  // Clerk seront dans la liste de notification.
  //
  // Source : récupérée via useUTMCapture (sessionStorage first-touch) qui détecte
  // Instagram, TikTok, Facebook, Google, etc. depuis utm_source OU referer.
  //
  // Idempotent : ON CONFLICT (email) DO NOTHING via try/catch sur code 23505.
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!user) return;
    const email = user.primaryEmailAddress?.emailAddress?.toLowerCase().trim();
    if (!email) return;

    // Skip admin (ils sont gérés par le useEffect précédent)
    if (ADMIN_EMAILS.includes(email)) return;

    // Récupère la source first-touch capturée par useUTMCapture
    const utm = getCapturedUTM();
    const source = utm?.source || 'direct';

    // Insert "best-effort" — si déjà présent (code 23505), on ignore silencieusement
    (async () => {
      try {
        const insertData = {
          email,
          source,
          utm_medium:   utm?.medium   || null,
          utm_campaign: utm?.campaign || null,
          referer:      utm?.referer  || null,
        };

        const { error } = await supabase
          .from('preinscriptions')
          .insert(insertData);

        if (error && error.code !== '23505') {
          // Erreur autre que "déjà présent" → on log mais on ne bloque pas l'UX
          console.warn('[MG360] Auto-insert preinscriptions échec:', error.message);
        } else if (!error) {
          console.log('[MG360] User Clerk auto-ajouté à preinscriptions:', email, '— source:', source);
        }
      } catch (e) {
        // Pas bloquant — l'utilisateur peut continuer à voir ComingSoon normalement
        console.warn('[MG360] Auto-insert preinscriptions exception:', e?.message);
      }
    })();
  }, [user]);
  // ════════════════════════════════════════════════════════════════════════

  const [tapCount, setTapCount]           = useState(0);
  const [profile, setProfile]             = useState(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  // Pré-inscription
  const [email, setEmail]           = useState("");
  const [emailStatus, setEmailStatus] = useState(null); // "ok" | "already" | "error"
  const [emailLoading, setEmailLoading] = useState(false);

  // Code admin
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [adminCode, setAdminCode]           = useState("");
  const [adminError, setAdminError]         = useState("");
  const [adminLoading, setAdminLoading]     = useState(false);

  // Code invité (famille / proches)
  const [guestCode, setGuestCode]           = useState("");
  const [guestError, setGuestError]         = useState("");
  const [guestLoading, setGuestLoading]     = useState(false);
  const [guestUnlocked, setGuestUnlocked]   = useState(false);
  const [showGuestInput, setShowGuestInput] = useState(false);

  // Compteur pré-inscrits (social proof)
  const [preinscritsCount, setPreinscritsCount] = useState(null);

  useEffect(() => {
    try {
      const p = localStorage.getItem("mg360_profile_v1");
      if (p) setProfile(JSON.parse(p));
    } catch {}
    fetchCount();
  }, []);

  // Tap secret ×5 sur logo → affiche input code admin
  useEffect(() => {
    if (tapCount >= 5) setShowAdminInput(true);
  }, [tapCount]);

  // ── Compteur pré-inscrits ──────────────────────────────────
  const fetchCount = async () => {
    try {
      const { count } = await supabase
        .from('preinscriptions')
        .select('*', { count: 'exact', head: true });
      if (count !== null) setPreinscritsCount(count);
    } catch {}
  };

  // ── Pré-inscription email ──────────────────────────────────
  const handlePreinscription = async () => {
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) return;
    setEmailLoading(true);
    setEmailStatus(null);

    const params = new URLSearchParams(window.location.search);
    const source = params.get('utm_source') || 'direct';

    try {
      const { error } = await supabase
        .from('preinscriptions')
        .insert({ email: email.toLowerCase().trim(), source });

      if (error?.code === '23505') {
        setEmailStatus('already');
      } else if (error) {
        setEmailStatus('error');
      } else {
        // Envoyer l'email de confirmation via Resend
        try {
          await fetch('/api/confirm-preinscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.toLowerCase().trim() }),
          });
        } catch {
          // L'email de confirmation est best-effort — pas bloquant
        }
        setEmailStatus('ok');
        setEmail('');
        fetchCount();
      }
    } catch {
      setEmailStatus('error');
    }
    setEmailLoading(false);
  };

  // ── Validation code admin ──────────────────────────────────
  const handleAdminCode = async () => {
    if (!adminCode.trim()) return;
    setAdminLoading(true);
    setAdminError('');

    // ✅ FIX : check storage avant tout
    if (storageBlocked) {
      setAdminError("Votre navigateur bloque le stockage local. Désactivez le mode privé ou autorisez les cookies pour ce site.");
      setAdminLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('admin_codes')
        .select('id')
        .eq('code', adminCode.trim())
        .eq('actif', true)
        .single();

      if (error || !data) {
        setAdminError('Code invalide ou expiré.');
        setAdminLoading(false);
        return;
      }

      // ✅ FIX : vérifier que les flags sont bien persistés
      const ok1 = safeSetItem('mg360_approved', 'true');
      const ok2 = safeSetItem('gk_admin_code', 'GREENKEEPER2024');
      safeRemoveItem('mg360_waitlist');

      if (!ok1 || !ok2) {
        setAdminError("Impossible d'enregistrer l'accès. Vérifiez les paramètres de votre navigateur.");
        setAdminLoading(false);
        return;
      }

      // ✅ Persistance Supabase — garantit l'accès sur tout device/navigateur
      if (user?.id) {
        await supabase
          .from("user_access")
          .upsert({
            user_id:              user.id,
            status:               "approved",
            approved_at:          new Date().toISOString(),
            onboarding_completed: false,
            updated_at:           new Date().toISOString(),
          }, { onConflict: "user_id" });
      }

      setAdminUnlocked(true);
      // ✅ FIX : reload complet pour relancer useAccessCheck depuis zéro
      setTimeout(() => { window.location.href = "/"; }, 1200);
    } catch {
      setAdminError('Erreur de connexion. Réessaie.');
    }
    setAdminLoading(false);
  };

  // ── Validation code invité ────────────────────────────────
  const handleGuestCode = async () => {
    if (!guestCode.trim()) return;
    setGuestLoading(true);
    setGuestError("");

    // ✅ FIX 26/05/2026 — check storage AVANT toute requête Supabase
    // Évite d'incrémenter uses_count si on ne peut pas persister l'accès
    if (storageBlocked) {
      setGuestError("Votre navigateur bloque le stockage local. Désactivez le mode privé/incognito ou autorisez les cookies pour ce site, puis réessayez.");
      setGuestLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("guest_codes")
        .select("id, max_uses, uses_count, expires_at")
        .eq("code", guestCode.trim().toUpperCase())
        .eq("actif", true)
        .single();

      if (error || !data) {
        setGuestError("Code invalide ou expiré.");
        setGuestLoading(false);
        return;
      }

      // Vérifier expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setGuestError("Ce code a expiré.");
        setGuestLoading(false);
        return;
      }

      // Vérifier limite d'utilisations
      if (data.max_uses !== null && data.uses_count >= data.max_uses) {
        setGuestError("Ce code a atteint sa limite d'utilisations.");
        setGuestLoading(false);
        return;
      }

      // ✅ FIX 26/05/2026 — poser les flags AVANT d'incrémenter uses_count
      // Si le storage échoue, on n'aura pas gonflé le compteur pour rien
      const ok1 = safeSetItem("mg360_guest_validated", "true");
      const ok2 = safeSetItem("mg360_guest_code", guestCode.trim().toUpperCase());
      const ok3 = safeSetItem("mg360_approved", "true");
      const ok4 = safeSetItem("mg360_onboarding_done", "true");
      safeRemoveItem("mg360_waitlist");

      if (!ok1 || !ok2 || !ok3 || !ok4) {
        setGuestError("Impossible d'enregistrer l'accès. Vérifiez les paramètres de votre navigateur (mode privé, cookies bloqués...).");
        setGuestLoading(false);
        return;
      }

      // ✅ Incrément uses_count APRÈS confirmation que le storage marche
      await supabase
        .from("guest_codes")
        .update({ uses_count: (data.uses_count || 0) + 1 })
        .eq("id", data.id);

      // ✅ Persistance Supabase — garantit l'accès sur tout device/navigateur
      if (user?.id) {
        await supabase
          .from("user_access")
          .upsert({
            user_id:              user.id,
            status:               "guest",
            guest_code:           guestCode.trim().toUpperCase(),
            approved_at:          new Date().toISOString(),
            onboarding_completed: false,
            updated_at:           new Date().toISOString(),
          }, { onConflict: "user_id" });
      }

      setGuestUnlocked(true);
      // ✅ FIX : reload propre — garantit que useAccessCheck repart à zéro
      // navigate("/") seul ne suffit pas si le state React de AppRoutes
      // est désynchronisé avec le localStorage qu'on vient de modifier
      setTimeout(() => { window.location.href = "/"; }, 1500);
    } catch {
      setGuestError("Erreur de connexion. Réessaie.");
    }
    setGuestLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    safeRemoveItem('mg360_waitlist');
    safeRemoveItem('mg360_approved');
    navigate('/login');
  };

  const GAZON_LABELS = {
    sport: "Sport / résistant", ombre: "Ombre / mi-ombre", sec: "Sec / méditerranéen",
    ornemental: "Ornemental", universel: "Universel / mélange", chaud: "Gazon chaud",
    synthetique: "Gazon synthétique", inconnu: "Recommandation automatique",
  };

  const profileItems = profile ? [
    ["🎯 Objectif", (() => {
      const map = { parfait: "Gazon parfait", fonctionnel: "Pelouse fonctionnelle", naturel: "Gazon naturel", renover: "Rénover ma pelouse", creer: "Créer une nouvelle pelouse" };
      return map[profile.objectif] || profile.objectif;
    })()],
    ["🌱 Gazon",   GAZON_LABELS[profile.pelouse] || profile.pelouse || "—"],
    ["📐 Surface", profile.surface ? `${profile.surface} m²` : "—"],
    ["📍 Ville",   profile.ville || "—"],
  ] : [];

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(180deg, #1a3d2b 0%, ${C.bg} 100%)`,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 20px", fontFamily: "Nunito, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* ✅ FIX 26/05/2026 — bannière d'alerte si navigateur restrictif */}
        {storageBlocked && (
          <div style={{
            background: "rgba(244,162,97,0.15)",
            border: "1px solid rgba(244,162,97,0.4)",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 16,
            fontSize: 12,
            color: C.orange,
            lineHeight: 1.5,
          }}>
            ⚠️ <strong>Stockage local bloqué.</strong> Votre navigateur empêche Mongazon360 de mémoriser votre accès.
            Désactivez le mode privé/incognito ou autorisez les cookies pour <strong>mongazon360.fr</strong>, puis rechargez la page.
          </div>
        )}

        {/* Logo — tap ×5 pour révéler l'input code admin */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img
            src="/mg360-mascot-transparent.png"
            alt="Mongazon360"
            onClick={() => setTapCount(n => n + 1)}
            style={{
              width: 88, height: 88, objectFit: "contain",
              display: "block", margin: "0 auto 16px", cursor: "pointer",
              filter: adminUnlocked ? "drop-shadow(0 0 16px rgba(82,183,136,0.8))" : "none",
              transition: "filter 0.3s",
            }}
          />
          {tapCount > 0 && tapCount < 5 && !showAdminInput && (
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>
              {"●".repeat(tapCount)}{"○".repeat(5 - tapCount)}
            </div>
          )}
          {adminUnlocked && (
            <div style={{ fontSize: 13, color: C.freshGreen, fontWeight: 800, marginBottom: 4 }}>
              🔓 Accès débloqué !
            </div>
          )}

          <div style={{ fontSize: 24, fontWeight: 900, color: C.lightGreen, marginBottom: 6 }}>
            {user?.firstName ? `Bienvenue ${user.firstName} ! 🌿` : "Bientôt disponible 🌿"}
          </div>
          <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.7 }}>
            Mongazon360 est en cours de déploiement. Laissez votre email pour être alerté à l'ouverture.
          </div>


        </div>

        {/* ── Formulaire pré-inscription ────────────────────── */}
        {emailStatus !== 'ok' ? (
          <div style={{
            background: "rgba(82,183,136,0.1)", border: `1px solid rgba(82,183,136,0.25)`,
            borderRadius: 16, padding: "16px", marginBottom: 20,
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.lightGreen, marginBottom: 10 }}>
              📬 Me prévenir à l'ouverture
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="email"
                placeholder="votre@email.fr"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePreinscription()}
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 10,
                  background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`,
                  color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none",
                }}
              />
              <button
                onClick={handlePreinscription}
                disabled={emailLoading || !email}
                style={{
                  padding: "10px 16px", borderRadius: 10,
                  background: "linear-gradient(135deg,#52b788,#2d6a4f)",
                  border: "none", color: "#fff", fontWeight: 800,
                  fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  opacity: emailLoading || !email ? 0.6 : 1,
                }}
              >
                {emailLoading ? "..." : "✓"}
              </button>
            </div>
            {emailStatus === 'already' && (
              <div style={{ fontSize: 11, color: C.orange, marginTop: 8 }}>
                ✉️ Cet email est déjà enregistré !
              </div>
            )}
            {emailStatus === 'error' && (
              <div style={{ fontSize: 11, color: "#ef9a9a", marginTop: 8 }}>
                Une erreur est survenue, réessaie.
              </div>
            )}
          </div>
        ) : (
          <div style={{
            background: "rgba(82,183,136,0.15)", border: "1px solid rgba(82,183,136,0.4)",
            borderRadius: 16, padding: "16px", marginBottom: 20, textAlign: "center",
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>🎉</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.lightGreen }}>C'est noté !</div>
            <div style={{ fontSize: 12, color: C.textSoft, marginTop: 4 }}>
              Un email de confirmation vous a été envoyé. Vous serez parmi les premiers à accéder à Mongazon360.
            </div>
          </div>
        )}

        {/* Compte utilisateur connecté */}
        {user && (
          <div style={{
            background: "rgba(82,183,136,0.1)", border: `1px solid rgba(82,183,136,0.25)`,
            borderRadius: 16, padding: "14px 16px", marginBottom: 20,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.deepGreen}, ${C.freshGreen})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 800, color: "#fff", flexShrink: 0,
            }}>
              {user.firstName?.[0] || user.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "?"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.lightGreen }}>
                {user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Mon compte"}
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.emailAddresses?.[0]?.emailAddress}
              </div>
            </div>
            <div style={{
              fontSize: 10, fontWeight: 800, color: C.orange,
              background: "rgba(244,162,97,0.15)", border: "1px solid rgba(244,162,97,0.3)",
              borderRadius: 8, padding: "3px 8px",
            }}>
              LISTE D'ATTENTE
            </div>
          </div>
        )}



        {/* ── Code invitation (visible) ─────────────────────── */}
        {!guestUnlocked ? (
          <div style={{ marginBottom: 20 }}>
            {!showGuestInput ? (
              <button
                onClick={() => setShowGuestInput(true)}
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 14,
                  background: "rgba(100,181,246,0.08)", border: "1px solid rgba(100,181,246,0.2)",
                  color: "#64b5f6", fontWeight: 700, fontSize: 13,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                🎟️ J'ai un code d'invitation
              </button>
            ) : (
              <div style={{
                background: "rgba(100,181,246,0.08)", border: "1px solid rgba(100,181,246,0.25)",
                borderRadius: 14, padding: "14px 16px",
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#64b5f6", marginBottom: 10 }}>
                  🎟️ Code d'invitation
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder=""
                    value={guestCode}
                    onChange={e => { setGuestCode(e.target.value.toUpperCase()); setGuestError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleGuestCode()}
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 10,
                      background: "rgba(255,255,255,0.07)", border: "1px solid rgba(100,181,246,0.3)",
                      color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}
                  />
                  <button
                    onClick={handleGuestCode}
                    disabled={guestLoading || !guestCode}
                    style={{
                      padding: "10px 16px", borderRadius: 10,
                      background: "linear-gradient(135deg,#1565c0,#0d47a1)",
                      border: "none", color: "#fff", fontWeight: 800,
                      fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                      opacity: guestLoading || !guestCode ? 0.6 : 1,
                    }}
                  >
                    {guestLoading ? "..." : "→"}
                  </button>
                </div>
                {guestError && (
                  <div style={{ fontSize: 11, color: "#ef9a9a", marginTop: 8, lineHeight: 1.5 }}>{guestError}</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            background: "rgba(82,183,136,0.15)", border: "1px solid rgba(82,183,136,0.4)",
            borderRadius: 14, padding: "14px 16px", marginBottom: 20, textAlign: "center",
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>🎉</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.lightGreen }}>Accès activé !</div>
            <div style={{ fontSize: 12, color: C.textSoft, marginTop: 4 }}>Bienvenue sur Mongazon360 🌿</div>
          </div>
        )}

        {/* ── Input code admin (révélé après ×5 taps) ──────── */}
        {showAdminInput && !adminUnlocked && (
          <div style={{
            background: "rgba(249,168,37,0.08)", border: "1px solid rgba(249,168,37,0.3)",
            borderRadius: 14, padding: "14px 16px", marginBottom: 20,
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#f9a825", marginBottom: 10 }}>
              🔐 Code d'accès admin
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="password"
                placeholder="Code secret"
                value={adminCode}
                onChange={e => { setAdminCode(e.target.value); setAdminError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAdminCode()}
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 10,
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(249,168,37,0.3)",
                  color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none",
                }}
              />
              <button
                onClick={handleAdminCode}
                disabled={adminLoading || !adminCode}
                style={{
                  padding: "10px 16px", borderRadius: 10,
                  background: "linear-gradient(135deg,#F59E0B,#D97706)",
                  border: "none", color: "#111", fontWeight: 800,
                  fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  opacity: adminLoading || !adminCode ? 0.6 : 1,
                }}
              >
                {adminLoading ? "..." : "→"}
              </button>
            </div>
            {adminError && (
              <div style={{ fontSize: 11, color: "#ef9a9a", marginTop: 8, lineHeight: 1.5 }}>{adminError}</div>
            )}
          </div>
        )}

        {/* Déconnexion */}
        <button
          onClick={handleSignOut}
          style={{
            width: "100%", padding: "13px 20px", borderRadius: 14,
            background: "rgba(255,255,255,0.05)",
            color: C.textMuted, fontWeight: 700, fontSize: 13,
            border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Se déconnecter
        </button>

      </div>
    </div>
  );
}
