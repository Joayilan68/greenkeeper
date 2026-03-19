import { useNavigate, useLocation } from "react-router-dom";

const tabs = [
  { path: "/",           icon: "📊", label: "Dashboard" },
  { path: "/diagnostic", icon: "🔬", label: "Diagnostic" },
  { path: "/my-lawn",    icon: "🌿", label: "Mon Gazon" },
  { path: "/today",      icon: "📅", label: "Aujourd'hui" },
  { path: "/products",   icon: "🛒", label: "Produits" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 430,
      background: "rgba(13,43,26,0.97)", backdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(165,214,167,0.15)",
      display: "flex", justifyContent: "space-around",
      padding: "8px 0 20px", zIndex: 100,
    }}>
      {tabs.map(t => {
        const active = pathname === t.path;
        return (
          <button key={t.path} onClick={() => navigate(t.path)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            background: "none", border: "none", cursor: "pointer",
            color: active ? "#a5d6a7" : "#4a7c5c",
            fontSize: 9, fontWeight: active ? 700 : 500, padding: "4px 8px",
            transition: "color 0.2s",
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
