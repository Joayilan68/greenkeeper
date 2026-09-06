// src/components/CookieBanner.jsx
// Bandeau de consentement cookies de mesure (Meta Pixel) — RGPD/CNIL.
// S'affiche tant que le visiteur n'a pas choisi. Le pixel ne se charge qu'après
// « Accepter ».
import { useEffect, useState } from "react";
import { getCookieConsent, setCookieConsent } from "../lib/cookieConsent";
import { loadMetaPixel } from "../lib/metaPixel";

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (getCookieConsent() === null) setShow(true);
  }, []);

  const accept = () => {
    setCookieConsent("granted");
    loadMetaPixel();
    setShow(false);
  };
  const refuse = () => {
    setCookieConsent("denied");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 9999,
      background: "rgba(11,31,18,0.98)", borderTop: "1px solid rgba(102,187,106,0.35)",
      backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
      padding: "14px 16px", boxShadow: "0 -8px 24px rgba(0,0,0,0.35)",
    }}>
      <div style={{
        maxWidth: 720, margin: "0 auto", display: "flex", flexWrap: "wrap",
        alignItems: "center", gap: 12, justifyContent: "space-between",
      }}>
        <div style={{ flex: "1 1 320px", fontSize: 12.5, lineHeight: 1.5, color: "#e8f5e9", fontFamily: "'Nunito','Segoe UI',sans-serif" }}>
          🍪 On utilise des cookies de <b>mesure d'audience</b> (Meta) pour comprendre d'où viennent nos visiteurs et améliorer nos publicités. Tu peux refuser sans rien perdre.{" "}
          <a href="/cookies" style={{ color: "#66BB6A", fontWeight: 700, textDecoration: "underline" }}>En savoir plus</a>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={refuse} style={{
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(165,214,167,0.3)",
            color: "#cfe8d4", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}>Refuser</button>
          <button onClick={accept} style={{
            background: "linear-gradient(135deg,#43A047,#2E7D32)", border: "none",
            color: "#fff", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 800,
            cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(46,125,50,0.4)",
          }}>Accepter</button>
        </div>
      </div>
    </div>
  );
}
