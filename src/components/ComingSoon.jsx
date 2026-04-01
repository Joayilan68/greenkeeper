// src/components/ComingSoon.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, useClerk } from "@clerk/clerk-react";

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

// Clé secrète admin — tap 5x sur le logo pour accéder
const ADMIN_SECRET = "mg360-admin-access";

export default function ComingSoon() {
  const navigate         = useNavigate();
  const { user }         = useUser();
  const { signOut }      = useClerk();
  const [tapCount, setTapCount]   = useState(0);
  const [profile, setProfile]     = useState(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  useEffect(() => {
    try {
      const p = localStorage.getItem("mg360_profile_v1");
      if (p) setProfile(JSON.parse(p));
    } catch {}
  }, []);

  // Tap secret sur logo → accès admin
  useEffect(() => {
    if (tapCount >= 5) {
      localStorage.setItem("mg360_approved", "true");
      localStorage.removeItem("mg360_waitlist");
      setAdminUnlocked(true);
      setTimeout(() => navigate("/"), 1200);
    }
  }, [tapCount, navigate]);

  const handleSignOut = async () => {
    await signOut();
    localStorage.removeItem("mg360_waitlist");
    localStorage.removeItem("mg360_approved");
    navigate("/login");
  };

  const profileItems = profile ? [
    ["🎯 Objectif", (() => {
      const map = { parfait: "Gazon parfait", fonctionnel: "Pelouse fonctionnelle", naturel: "Gazon naturel", renover: "Rénover ma pelouse", creer: "Créer une nouvelle pelouse" };
      return map[profile.objectif] || profile.objectif;
    })()],
    ["🌱 Gazon",   profile.pelouse],
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

        {/* Logo — tap secret ×5 */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img
            src="/icon-512x512.png"
            alt="Mongazon360"
            onClick={() => setTapCount(n => n + 1)}
            style={{
              width: 88, height: 88, borderRadius: 22,
              objectFit: "cover", display: "block", margin: "0 auto 16px",
              cursor: "pointer",
              boxShadow: adminUnlocked
                ? `0 0 32px rgba(82,183,136,0.8)`
                : `0 4px 24px rgba(0,0,0,0.4)`,
              transition: "box-shadow 0.3s",
            }}
          />

          {/* Feedback tap admin */}
          {tapCount > 0 && tapCount < 5 && (
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>
              {"●".repeat(tapCount)}{"○".repeat(5 - tapCount)}
            </div>
          )}
          {adminUnlocked && (
            <div style={{ fontSize: 13, color: C.freshGreen, fontWeight: 800, marginBottom: 4 }}>
              🔓 Accès admin débloqué !
            </div>
          )}

          <div style={{ fontSize: 24, fontWeight: 900, color: C.lightGreen, marginBottom: 6 }}>
            Vous êtes sur la liste ! 🌿
          </div>
          <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.7 }}>
            Mongazon360 est en cours de déploiement. Vous serez parmi les premiers avertis à l'ouverture officielle.
          </div>
        </div>

        {/* Compte utilisateur */}
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
                padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
                fontSize: 12,
              }}>
                <span style={{ color: C.textSoft }}>{label}</span>
                <span style={{ fontWeight: 700, color: C.text, textTransform: "capitalize" }}>{val}</span>
              </div>
            ))}
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                <span style={{ color: C.textSoft, fontWeight: 700 }}>Complétude du profil</span>
                <span style={{ color: C.orange, fontWeight: 800 }}>40%</span>
              </div>
              <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 4 }}>
                <div style={{ width: "40%", height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${C.deepGreen}, ${C.freshGreen})` }} />
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>
                Vous pourrez compléter votre profil à l'ouverture.
              </div>
            </div>
          </div>
        )}

        {/* Message d'attente */}
        <div style={{
          background: "rgba(82,183,136,0.07)", border: `1px solid ${C.border}`,
          borderRadius: 14, padding: "14px 16px", marginBottom: 24,
          fontSize: 12, color: C.textSoft, lineHeight: 1.8, textAlign: "center",
        }}>
          🌱 Vos données sont sauvegardées et prêtes.<br />
          Vous recevrez un email dès l'ouverture à l'adresse enregistrée.
        </div>

        {/* Déconnexion */}
        <button
          onClick={handleSignOut}
          style={{
            width: "100%", padding: "13px 20px", borderRadius: 14,
            background: "rgba(255,255,255,0.05)",
            color: C.textMuted, fontWeight: 700, fontSize: 13,
            border: `1px solid ${C.border}`, cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Se déconnecter
        </button>

      </div>
    </div>
  );
}
