import { useNavigate, useLocation } from "react-router-dom";
import { useGreenPoints } from "../lib/useGreenPoints";
import { useClassement } from "../lib/useClassement";
import { useSaison } from "../lib/useSaison";

const tabs = [
  { path: "/",            icon: "📊", label: "Dashboard" },
  { path: "/diagnostic",  icon: "🔬", label: "Diagnostic" },
  { path: "/my-lawn",     icon: "🌿", label: "Mon Gazon" },
  { path: "/today",       icon: "📅", label: "Aujourd'hui" },
  { path: "/products",    icon: "🛒", label: "Produits" },
  { path: "/classement",  icon: "🏆", label: "Classement" },
];

export default function BottomNav() {
  const navigate    = useNavigate();
  const { pathname } = useLocation();
  const { total: gpTotal, palier } = useGreenPoints();
  const { classementActif, enZoneRetrogradation } = useClassement();
  const { classementActif: saisonActif } = useSaison();

  return (
    <nav style={{
      position:        "fixed",
      bottom:          0,
      left:            "50%",
      transform:       "translateX(-50%)",
      width:           "100%",
      maxWidth:        430,
      background:      "rgba(13,43,26,0.97)",
      backdropFilter:  "blur(20px)",
      borderTop:       "1px solid rgba(165,214,167,0.15)",
      display:         "flex",
      flexDirection:   "column",
      zIndex:          100,
    }}>

      {/* ── Bandeau GreenPoints ────────────────────────────────────────────── */}
      <div style={{
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        gap:             8,
        padding:         "5px 16px 3px",
        borderBottom:    "1px solid rgba(255,255,255,0.05)",
      }}>
        <span style={{ fontSize: 11 }}>{palier?.icone}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#a5d6a7" }}>
          {gpTotal.toLocaleString("fr-FR")} pts
        </span>
        <span style={{ fontSize: 10, color: "#4a7c5c" }}>·</span>
        <span style={{ fontSize: 10, color: "#4a7c5c" }}>{palier?.label}</span>
      </div>

      {/* ── Onglets ────────────────────────────────────────────────────────── */}
      <div style={{
        display:         "flex",
        justifyContent:  "space-around",
        padding:         "6px 0 20px",
      }}>
        {tabs.map(t => {
          const active         = pathname === t.path;
          const isClassement   = t.path === "/classement";

          // Badge alerte si en zone de rétrogradation
          const showBadgeRetro = isClassement && saisonActif && enZoneRetrogradation;
          // Badge pause si hiver
          const showBadgePause = isClassement && !saisonActif;

          return (
            <button
              key={t.path}
              onClick={() => navigate(t.path)}
              style={{
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                gap:            2,
                background:     "none",
                border:         "none",
                cursor:         "pointer",
                color:          active ? "#a5d6a7" : "#4a7c5c",
                fontSize:       9,
                fontWeight:     active ? 700 : 500,
                padding:        "4px 8px",
                transition:     "color 0.2s",
                position:       "relative",
              }}
            >
              {/* Icône avec badge éventuel */}
              <div style={{ position: "relative" }}>
                <span style={{ fontSize: 20 }}>{t.icon}</span>

                {/* Badge rétrogradation */}
                {showBadgeRetro && (
                  <div style={{
                    position:     "absolute",
                    top:          -4,
                    right:        -6,
                    background:   "#e65100",
                    borderRadius: "50%",
                    width:        10,
                    height:       10,
                    border:       "1.5px solid rgba(13,43,26,0.97)",
                  }}/>
                )}

                {/* Badge pause hiver */}
                {showBadgePause && (
                  <div style={{
                    position:     "absolute",
                    top:          -4,
                    right:        -6,
                    background:   "#1565c0",
                    borderRadius: "50%",
                    width:        10,
                    height:       10,
                    border:       "1.5px solid rgba(13,43,26,0.97)",
                    fontSize:     6,
                    display:      "flex",
                    alignItems:   "center",
                    justifyContent: "center",
                    color:        "white",
                  }}>
                    ❄
                  </div>
                )}
              </div>

              <span>{t.label}</span>

              {/* Point actif */}
              {active && (
                <div style={{
                  width:        4,
                  height:       4,
                  borderRadius: "50%",
                  background:   "#43a047",
                  marginTop:    1,
                }}/>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
