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
        <div style={{ fontSize: 26, fontWeight: 800, color: "#a5d6a7" }}>Mongazon360</div>
        <div style={{ fontSize: 13, color: "#81c784", marginTop: 4 }}>Tant qu'il y a gazon, il y a match</div>
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