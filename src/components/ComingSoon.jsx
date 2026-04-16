// src/components/ComingSoon.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, useClerk } from "@clerk/clerk-react";
import { supabase } from "../lib/supabase";

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

export default function ComingSoon() {
  const navigate    = useNavigate();
  const { user }    = useUser();
  const { signOut } = useClerk();

  // Auto-redirect admin — ne jamais bloquer un admin sur ComingSoon
  useEffect(() => {
    if (!user) return;
    const email = user.primaryEmailAddress?.emailAddress || "";
    if (ADMIN_EMAILS.includes(email) || user.publicMetadata?.role === "admin") {
      localStorage.setItem("mg360_approved",       "true");
      localStorage.setItem("gk_admin_code",         "GREENKEEPER2024");
      localStorage.setItem("mg360_onboarding_done", "true");
      localStorage.removeItem("mg360_waitlist");
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const [tapCount, setTapCount]           = useState(0);
  const [profile, setProfile]             = useState(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  // Pré-inscription
  const [email, setEmail]         = useState("");
  const [emailStatus, setEmailStatus] = useState(null); // "ok" | "already" | "error"
  const [emailLoading, setEmailLoading] = useState(false);

  // Code admin
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [adminCode, setAdminCode]           = useState("");
  const [adminError, setAdminError]         = useState("");
  const [adminLoading, setAdminLoading]     = useState(false);

  // Compteur pré-inscrits (optionnel — social proof)
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

    // Récupérer utm_source depuis l'URL si présent
    const params = new URLSearchParams(window.location.search);
    const source = params.get('utm_source') || 'direct';

    try {
      const { error } = await supabase
        .from('preinscriptions')
        .insert({ email: email.toLowerCase().trim(), source });

      if (error?.code === '23505') {
        setEmailStatus('already'); // unique constraint → déjà inscrit
      } else if (error) {
        setEmailStatus('error');
      } else {
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

      // Code valide → déverrouiller
      localStorage.setItem('mg360_approved', 'true');
      localStorage.setItem('gk_admin_code', 'GREENKEEPER2024'); // active tier admin dans useSubscription
      localStorage.removeItem('mg360_waitlist');
      setAdminUnlocked(true);
      setTimeout(() => navigate('/'), 1200);
    } catch {
      setAdminError('Erreur de connexion. Réessaie.');
    }
    setAdminLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    localStorage.removeItem('mg360_waitlist');
    localStorage.removeItem('mg360_approved');
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

          {/* Social proof compteur */}
          {preinscritsCount > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: C.freshGreen, fontWeight: 700 }}>
              🌱 {preinscritsCount} personne{preinscritsCount > 1 ? 's' : ''} déjà sur la liste
            </div>
          )}
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
              Vous serez parmi les premiers à accéder à Mongazon360.
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

        {/* Résumé profil */}
        {profileItems.length > 0 && (
          <div style={{
            background: C.bgCard, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: 16, marginBottom: 20,
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.lightGreen, marginBottom: 12 }}>
              📋 Votre profil est prêt
            </div>
            {profileItems.map(([label, val]) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between",
                padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 12,
              }}>
                <span style={{ color: C.textSoft }}>{label}</span>
                <span style={{ fontWeight: 700, color: C.text, textTransform: "capitalize" }}>{val}</span>
              </div>
            ))}
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
              <div style={{ fontSize: 11, color: "#ef9a9a", marginTop: 8 }}>{adminError}</div>
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
