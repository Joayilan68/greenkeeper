import { useState } from "react";
import { useNavigate } from "react-router-dom";

const COLORS = {
  danger:  { bg: "rgba(183,28,28,0.2)",  border: "rgba(229,57,53,0.4)",  badge: "#c62828" },
  warning: { bg: "rgba(230,81,0,0.2)",   border: "rgba(239,108,0,0.4)",  badge: "#e65100" },
  info:    { bg: "rgba(21,101,192,0.15)", border: "rgba(66,165,245,0.3)", badge: "#1565c0" },
};

export default function NotificationsPanel({ notifications, isPaid }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState([]);
  const [expanded, setExpanded] = useState(false);

  const visible = notifications.filter(n => !dismissed.includes(n.id));
  const dangers = visible.filter(n => n.type === "danger").length;
  const warnings = visible.filter(n => n.type === "warning").length;

  if (visible.length === 0) return null;

  const displayed = expanded ? visible : visible.slice(0, 2);

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 8, padding: "0 2px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#e8f5e9" }}>
            🔔 Alertes
          </span>
          {dangers > 0 && (
            <span style={{ background: "#c62828", color: "#fff", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
              {dangers} urgent{dangers > 1 ? "s" : ""}
            </span>
          )}
          {warnings > 0 && (
            <span style={{ background: "#e65100", color: "#fff", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
              {warnings} warning{warnings > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {visible.length > 2 && (
          <button onClick={() => setExpanded(!expanded)} style={{
            background: "none", border: "none", color: "#81c784",
            fontSize: 12, cursor: "pointer", fontWeight: 600
          }}>
            {expanded ? "Réduire ▲" : `+${visible.length - 2} autres ▼`}
          </button>
        )}
      </div>

      {/* Notifications */}
      {displayed.map(n => {
        const c = COLORS[n.type] || COLORS.info;
        return (
          <div key={n.id} style={{
            background: c.bg, border: `1px solid ${c.border}`,
            borderRadius: 14, padding: "12px 14px", marginBottom: 8,
            position: "relative"
          }}>
            {/* Dismiss */}
            <button onClick={() => setDismissed(p => [...p, n.id])} style={{
              position: "absolute", top: 8, right: 10,
              background: "none", border: "none", color: "rgba(255,255,255,0.4)",
              cursor: "pointer", fontSize: 16, lineHeight: 1
            }}>×</button>

            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", paddingRight: 20 }}>
              <span style={{ fontSize: 22, minWidth: 28 }}>{n.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: "#e8f5e9" }}>
                  {n.title}
                  {n.impact < 0 && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: "#ef9a9a", fontWeight: 600 }}>
                      {n.impact} pts
                    </span>
                  )}
                  {n.impact > 0 && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: "#a5d6a7", fontWeight: 600 }}>
                      +{n.impact} pts potentiels
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#81c784", lineHeight: 1.5, marginBottom: 8 }}>
                  {n.message}
                </div>
                {n.action && (
                  <button onClick={() => navigate(n.actionRoute)} style={{
                    background: c.badge, border: "none", borderRadius: 8,
                    padding: "6px 14px", color: "#fff", fontSize: 12,
                    fontWeight: 700, cursor: "pointer"
                  }}>
                    {n.action} →
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Lock pour free */}
      {!isPaid && visible.length > 1 && (
        <div style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14, padding: "10px 14px", textAlign: "center", fontSize: 12, color: "#81c784"
        }}>
          🔒 {visible.length - 1} alerte{visible.length - 1 > 1 ? "s" : ""} supplémentaire{visible.length - 1 > 1 ? "s" : ""} — <span style={{ color: "#a5d6a7", cursor: "pointer", textDecoration: "underline" }} onClick={() => navigate("/subscribe")}>Passer Premium</span>
        </div>
      )}
    </div>
  );
}
