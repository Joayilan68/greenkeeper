import { useEffect } from "react";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { appShell } from "../lib/styles";
import { isInAppBrowser } from "../lib/inapp";
import OpenInBrowser from "../components/OpenInBrowser";
import { trackFunnelOncePerSession } from "../lib/funnel";

// mode = "signup" (création de compte, parcours d'acquisition par défaut)
//      | "signin" (connexion, pour ceux qui ont déjà un compte)
export default function Login({ mode = "signin" }) {
  // Suivi d'entonnoir : le prospect est arrivé sur l'écran compte.
  useEffect(() => {
    trackFunnelOncePerSession("auth_screen_view", { mode });
  }, [mode]);

  // Navigateur in-app (Instagram, TikTok…) : l'auth Clerk y est bloquée.
  // On invite à ouvrir dans un vrai navigateur — mais seulement ICI, à l'étape
  // compte, pas à l'arrivée (la landing, elle, s'affiche bien dans l'in-app).
  if (isInAppBrowser()) return <OpenInBrowser />;

  const appearance = {
    variables: {
      colorPrimary: "#43a047",
      colorBackground: "#1a4731",
      colorText: "#e8f5e9",
      colorInputBackground: "rgba(255,255,255,0.08)",
      colorInputText: "#e8f5e9",
      borderRadius: "14px",
    },
  };

  const isSignup = mode === "signup";

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
        <div style={{ fontSize: 13, color: "#81c784", marginTop: 4 }}>
          {isSignup ? "Crée ton compte — c'est parti en 1 clic" : "Content de te revoir"}
        </div>
        <div style={{ display:"inline-block", marginTop:14, fontSize:12.5, fontWeight:700, color:"#0b1f12", background:"linear-gradient(135deg,#66BB6A,#43A047)", borderRadius:999, padding:"6px 16px" }}>
          🎁 7 jours de Premium offerts
        </div>
      </div>

      {isSignup ? (
        <SignUp
          routing="hash"
          signInUrl="/login"
          afterSignUpUrl="/"
          afterSignInUrl="/"
          appearance={appearance}
        />
      ) : (
        <SignIn
          routing="hash"
          signUpUrl="/signup"
          afterSignInUrl="/"
          afterSignUpUrl="/"
          appearance={appearance}
        />
      )}

      {/* ✅ Mention légale discrète marque déposée */}
      <div style={{ marginTop: 24, fontSize: 10, color: "#4a7c5c", textAlign: "center", maxWidth: 360, lineHeight: 1.6 }}>
        Mongazon360™ est une marque déposée à l'EUIPO — protégée dans les 27 pays de l'Union européenne.
      </div>
    </div>
  );
}
