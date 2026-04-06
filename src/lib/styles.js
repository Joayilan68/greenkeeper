// src/lib/styles.js
// Design System Mongazon360 — Palette premium "Apple + startup IA"

export const C = {
  // Palette principale
  darkGreen:   "#0F2F1F",   // Fond profond
  midGreen:    "#1B5E20",   // Fond secondaire
  accent:      "#2E7D32",   // Vert principal
  accentBright:"#66BB6A",   // Vert accent lumineux
  accentLight: "#A5D6A7",   // Vert clair texte/pill
  text:        "#F1F8F2",   // Blanc cassé texte principal
  muted:       "#81C784",   // Texte secondaire
  card:        "rgba(255,255,255,0.07)",
  cardBorder:  "rgba(165,214,167,0.18)",
  blue:        "rgba(25,118,210,0.15)",
  blueBorder:  "rgba(100,181,246,0.25)",
  danger:      "rgba(183,28,28,0.2)",
  warning:     "rgba(230,81,0,0.2)",
};

// ── Carte glassmorphism ────────────────────────────────────────────────────────
export const card = (extra = {}) => ({
  background:           "rgba(255,255,255,0.07)",
  backdropFilter:       "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius:         20,
  border:               "1px solid rgba(165,214,167,0.18)",
  padding:              "18px",
  marginBottom:         12,
  boxShadow:            "0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
  ...extra,
});

export const cardTitle = {
  fontSize:        11,
  fontWeight:      700,
  letterSpacing:   1.2,
  textTransform:   "uppercase",
  color:           "#81C784",
  marginBottom:    10,
  display:         "flex",
  justifyContent:  "space-between",
  alignItems:      "center",
};

export const pill = (bg = "rgba(76,175,80,0.2)") => ({
  display:      "inline-block",
  background:   bg,
  border:       "1px solid rgba(76,175,80,0.3)",
  borderRadius: 20,
  padding:      "4px 12px",
  fontSize:     12,
  fontWeight:   600,
});

export const btn = {
  primary: {
    background:   "linear-gradient(135deg, #43A047, #2E7D32)",
    color:        "#fff",
    border:       "none",
    borderRadius: 14,
    padding:      "14px 24px",
    fontSize:     15,
    fontWeight:   700,
    cursor:       "pointer",
    width:        "100%",
    display:      "block",
    boxShadow:    "0 4px 16px rgba(46,125,50,0.4)",
    transition:   "all 0.2s ease",
  },
  ghost: {
    background:   "rgba(255,255,255,0.07)",
    color:        "#e8f5e9",
    border:       "1px solid rgba(165,214,167,0.25)",
    borderRadius: 14,
    padding:      "14px 24px",
    fontSize:     15,
    fontWeight:   700,
    cursor:       "pointer",
    width:        "100%",
    display:      "block",
    transition:   "all 0.2s ease",
  },
  sm: {
    background:   "rgba(76,175,80,0.2)",
    border:       "none",
    borderRadius: 8,
    padding:      "5px 12px",
    color:        "#A5D6A7",
    fontSize:     11,
    cursor:       "pointer",
  },
};

// ── App shell ──────────────────────────────────────────────────────────────────
export const appShell = {
  fontFamily:  "'Nunito', 'Segoe UI', sans-serif",
  background:  `linear-gradient(160deg, #0F2F1F 0%, #1B5E20 50%, #0d2519 100%)`,
  minHeight:   "100vh",
  maxWidth:    430,
  margin:      "0 auto",
  color:       "#F1F8F2",
  position:    "relative",
};

// ── Scroll container ───────────────────────────────────────────────────────────
export const scroll = {
  padding:    "0 16px 100px",
  overflowY:  "auto",
};

// ── Header ─────────────────────────────────────────────────────────────────────
export const header = {
  padding:    "48px 20px 16px",
  textAlign:  "center",
};
