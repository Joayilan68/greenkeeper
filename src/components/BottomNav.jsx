import { useNavigate, useLocation } from "react-router-dom";

const tabs = [
  { path: "/",        icon: "🏠", label: "Accueil" },
  { path: "/today",   icon: "🌿", label: "Aujourd'hui" },
  { path: "/week",    icon: "📅", label: "Semaine" },
  { path: "/history", icon: "📋", label: "Historique" },
];

export default function BottomNav() {
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 430,
      background: "rgba(13,43,26,0.97)", backdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(165,214,167,0.15)",
      display: "flex", justifyContent: "space-around",
      padding: "10px 0 20px", zIndex: 100,
    }}>
      {tabs.map(t => {
        const active = pathname === t.path;
        return (
          <button key={t.path} onClick={() => navigate(t.path)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            background: "none", border: "none", cursor: "pointer",
            color: active ? "#a5d6a7" : "#4a7c5c",
            fontSize: 10, fontWeight: active ? 700 : 500, padding: "4px 12px",
          }}>
            <span style={{ fontSize: 22 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
