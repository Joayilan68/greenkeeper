import { SignIn } from "@clerk/clerk-react";
import { appShell } from "../lib/styles";

export default function Login() {
  return (
    <div style={{ ...appShell, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <img
          src="/mg360-mascot-transparent.png"
          alt="Mongazon360"
          style={{ width: 80, height: 80, objectFit: "contain", display: "block", margin: "0 auto 8px" }}
        />
        {/* ✅ Marque déposée EUIPO 30/05/2026 — afficher ™ jusqu'à enregistrement définitif (nov 2026) */}
        <div style={{ fontSize: 26, fontWeight: 800, color: "#a5d6a7" }}>
          Mongazon360<sup style={{ fontSize: 12, fontWeight: 600, marginLeft: 2, color: "#81c784" }}>™</sup>
        </div>
        <div style={{ fontSize: 13, color: "#81c784", marginTop: 4 }}>Tant qu'il y a gazon, il y a match</div>
      </div>
      <SignIn
        routing="hash"
        afterSignInUrl="/"
        afterSignUpUrl="/"
        appearance={{
          variables: {
            colorPrimary: "#43a047",
            colorBackground: "#1a4731",
            colorText: "#e8f5e9",
            colorInputBackground: "rgba(255,255,255,0.08)",
            colorInputText: "#e8f5e9",
            borderRadius: "14px",
          }
        }}
      />
      {/* ✅ Mention légale discrète marque déposée */}
      <div style={{ marginTop: 24, fontSize: 10, color: "#4a7c5c", textAlign: "center", maxWidth: 360, lineHeight: 1.6 }}>
        Mongazon360™ est une marque déposée à l'EUIPO — protégée dans les 27 pays de l'Union européenne.
      </div>
    </div>
  );
}
