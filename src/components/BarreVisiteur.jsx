// src/components/BarreVisiteur.jsx
// Barre du bas d'un visiteur sans compte (refonte, décision de Jordan du 26/10/2026) : Accueil, Conseils (rubrique
// statique /conseils, hors de l'app), Diagnostic (essai sans compte), Compte (création ou connexion).
import { useNavigate, useLocation } from "react-router-dom";

const onglets = [
  { path: "/",         icon: "🏠", label: "Accueil" },
  { path: "/conseils", icon: "📚", label: "Conseils", page: true },
  { path: "/essai",    icon: "🔬", label: "Diagnostic" },
  { path: "/signup",   icon: "👤", label: "Compte" },
];

export default function BarreVisiteur() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <nav aria-label="Navigation" style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480,
      background: "rgba(13,43,26,0.97)", backdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(165,214,167,0.15)",
      display: "flex", justifyContent: "space-around",
      padding: "8px 0 20px", zIndex: 100,
    }}>
      {onglets.map(t => {
        const active = pathname === t.path;
        return (
          <button key={t.path} onClick={() => (t.page ? window.location.assign(t.path) : navigate(t.path))} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
            color: active ? "#a5d6a7" : "#4a7c5c",
            fontSize: 10, fontWeight: active ? 700 : 500, padding: "4px 8px",
          }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span>{t.label}</span>
            {active && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#43a047", marginTop: 1 }} />}
          </button>
        );
      })}
    </nav>
  );
}
