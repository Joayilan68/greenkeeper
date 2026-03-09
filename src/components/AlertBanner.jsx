export default function AlertBanner({ alert }) {
  const colors = {
    danger:  { bg: "rgba(183,28,28,0.2)",  border: "rgba(229,57,53,0.4)" },
    warning: { bg: "rgba(230,81,0,0.2)",   border: "rgba(239,108,0,0.4)" },
    info:    { bg: "rgba(21,101,192,0.2)", border: "rgba(66,165,245,0.4)" },
  };
  const c = colors[alert.type] || colors.info;
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 14, padding: "12px 16px", marginBottom: 10,
      fontSize: 13, fontWeight: 600, color: "#e8f5e9",
    }}>
      {alert.msg}
    </div>
  );
}
