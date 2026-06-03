import BottomNav from "./BottomNav";
import AIAssistant from "./AIAssistant";
import { appShell } from "../lib/styles";

// ✅ Footer discret intégrant la marque Mongazon360™
// Marque déposée à l'EUIPO le 30/05/2026 — afficher ™ jusqu'à enregistrement définitif (nov 2026)
function BrandFooter() {
  const year = new Date().getFullYear();
  return (
    <div style={{
      padding:    "12px 16px 80px",  // 80px en bas pour ne pas chevaucher la BottomNav
      textAlign:  "center",
      fontSize:   10,
      color:      "#4a7c5c",
      lineHeight: 1.6,
      opacity:    0.7,
    }}>
      <div style={{ fontWeight: 600 }}>
        © {year} Mongazon360<sup style={{ fontSize: 8 }}>™</sup>
      </div>
      <div style={{ fontSize: 9, marginTop: 2 }}>
        Marque déposée à l'EUIPO — Tous droits réservés
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  return (
    <div style={appShell}>
      {children}
      <BrandFooter />
      <BottomNav />
      <AIAssistant />
    </div>
  );
}
