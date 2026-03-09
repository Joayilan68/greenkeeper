import { SignIn } from "@clerk/clerk-react";
import { appShell } from "../lib/styles";

export default function Login() {
  return (
    <div style={{ ...appShell, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🌿</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#a5d6a7" }}>GreenKeeper</div>
        <div style={{ fontSize: 13, color: "#81c784", marginTop: 4 }}>Entretien pelouse intelligent</div>
      </div>
      <SignIn
        routing="hash"
        afterSignInUrl="/"
        afterSignUpUrl="/subscribe"
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
    </div>
  );
}
