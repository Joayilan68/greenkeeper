export const C = {
  darkGreen:  "#0d2b1a",
  midGreen:   "#1a4731",
  accent:     "#43a047",
  accentLight:"#a5d6a7",
  text:       "#e8f5e9",
  muted:      "#81c784",
  card:       "rgba(255,255,255,0.06)",
  cardBorder: "rgba(165,214,167,0.15)",
  blue:       "rgba(25,118,210,0.15)",
  blueBorder: "rgba(100,181,246,0.25)",
  danger:     "rgba(183,28,28,0.2)",
  warning:    "rgba(230,81,0,0.2)",
};

export const card = (extra = {}) => ({
  background: C.card,
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  borderRadius: 20,
  border: `1px solid ${C.cardBorder}`,
  padding: "18px",
  marginBottom: 12,
  ...extra,
});

export const cardTitle = {
  fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
  textTransform: "uppercase", color: C.muted, marginBottom: 10,
  display: "flex", justifyContent: "space-between", alignItems: "center",
};

export const pill = (bg = "rgba(76,175,80,0.2)") => ({
  display: "inline-block", background: bg,
  border: "1px solid rgba(76,175,80,0.3)",
  borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600,
});

export const btn = {
  primary: {
    background: "linear-gradient(135deg, #43a047, #2e7d32)",
    color: "#fff", border: "none", borderRadius: 14,
    padding: "14px 24px", fontSize: 15, fontWeight: 700,
    cursor: "pointer", width: "100%", display: "block",
  },
  ghost: {
    background: "transparent", color: "#e8f5e9",
    border: "1px solid rgba(255,255,255,0.2)", borderRadius: 14,
    padding: "14px 24px", fontSize: 15, fontWeight: 700,
    cursor: "pointer", width: "100%", display: "block",
  },
  sm: {
    background: "rgba(76,175,80,0.2)", border: "none",
    borderRadius: 8, padding: "5px 12px",
    color: "#a5d6a7", fontSize: 11, cursor: "pointer",
  },
};

export const appShell = {
  fontFamily: "'Nunito', 'Segoe UI', sans-serif",
  background: `linear-gradient(160deg, #0d2b1a 0%, #1a4731 40%, #0f3320 100%)`,
  minHeight: "100vh", maxWidth: 430, margin: "0 auto",
  color: "#e8f5e9", position: "relative",
};

export const scroll = {
  padding: "0 16px 100px", overflowY: "auto",
};

export const header = {
  padding: "48px 20px 16px", textAlign: "center",
};
