import { useEffect } from "react";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { appShell } from "../lib/styles";
import { isInAppBrowser } from "../lib/inapp";
import { trackFunnelOncePerSession } from "../lib/funnel";
import { pixelTrack } from "../lib/metaPixel";

// mode = "signup" (création de compte, parcours d'acquisition par défaut)
//      | "signin" (connexion, pour ceux qui ont déjà un compte)
export default function Login({ mode = "signin" }) {
  useEffect(() => {
    trackFunnelOncePerSession("auth_screen_view", { mode });
    if (mode === "signup") pixelTrack("Lead"); // signal d'intention → Meta (si pixel chargé)
  }, [mode]);

  // Navigateur in-app (Instagram, TikTok…) : l'auth SOCIALE (Google/Facebook) y
  // est bloquée par Google (webview interdit). MAIS l'inscription par EMAIL y
  // fonctionne. On affiche donc TOUJOURS le formulaire Clerk directement (plus
  // de page-mur « ouvre dans Chrome »), et dans l'in-app on masque juste les
  // boutons sociaux qui échoueraient — l'utilisateur s'inscrit par email en 2 clics.
  const inApp = isInAppBrowser();
  const isSignup = mode === "signup";

  const appearance = {
    layout: inApp ? {} : { socialButtonsPlacement: "top", socialButtonsVariant: "blockButton" },
    // Dans l'in-app : cacher les boutons sociaux (ils ne marchent pas) + le séparateur.
    elements: inApp ? { socialButtonsRoot: { display: "none" }, dividerRow: { display: "none" } } : undefined,
    variables: {
      colorPrimary: "#43a047",
      colorBackground: "#1a4731",
      colorText: "#e8f5e9",
      colorInputBackground: "rgba(255,255,255,0.08)",
      colorInputText: "#e8f5e9",
      borderRadius: "14px",
    },
  };

  return (
    <div style={{ ...appShell, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <img
          src="/mg360-mascot-transparent.png"
          alt="Mongazon360"
          style={{ width: 74, height: 74, objectFit: "contain", display: "block", margin: "0 auto 8px" }}
        />
        {/* ✅ Marque déposée EUIPO 30/05/2026 — afficher ™ jusqu'à enregistrement définitif (nov 2026) */}
        <div style={{ fontSize: 26, fontWeight: 800, color: "#a5d6a7" }}>
          Mongazon360<sup style={{ fontSize: 12, fontWeight: 600, marginLeft: 2, color: "#81c784" }}>™</sup>
        </div>
        <div style={{ fontSize: 13, color: "#81c784", marginTop: 4 }}>
          {isSignup ? "Crée ton compte — c'est immédiat" : "Content de te revoir"}
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

      {inApp && (
        <div style={{ marginTop: 14, fontSize: 11.5, color: "#81c784", textAlign: "center", maxWidth: 320, lineHeight: 1.5 }}>
          💡 Astuce : pour {isSignup ? "t'inscrire" : "te connecter"} avec Google, ouvre ce lien dans Chrome ou Safari. Sinon, l'email fonctionne parfaitement ici.
        </div>
      )}

      {/* ✅ Mention légale discrète marque déposée */}
      <div style={{ marginTop: 20, fontSize: 10, color: "#4a7c5c", textAlign: "center", maxWidth: 360, lineHeight: 1.6 }}>
        Mongazon360™ est une marque déposée à l'EUIPO — protégée dans les 27 pays de l'Union européenne.
      </div>
    </div>
  );
}
