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

  // Navigateur in-app (Instagram, TikTok…) : Google/Facebook y sont bloqués par
  // Google (webview interdit). On masque donc les boutons sociaux natifs de Clerk
  // (ils échoueraient) et on affiche à la place un bouton "Google" qui OUVRE le
  // vrai navigateur, où l'auth sociale fonctionne. L'email, lui, marche ici même.
  const inApp = isInAppBrowser();
  const isSignup = mode === "signup";
  const path = isSignup ? "/signup" : "/login";

  const openInRealBrowser = () => {
    const url = "https://mongazon360.fr" + path;
    const ua = typeof navigator !== "undefined" ? (navigator.userAgent || "") : "";
    try {
      if (/Android/i.test(ua)) {
        window.location.href =
          `intent://mongazon360.fr${path}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
      } else if (/iPhone|iPad|iPod/i.test(ua)) {
        window.location.href = "x-safari-" + url;
      } else {
        window.open(url, "_blank");
      }
    } catch {
      window.open(url, "_blank");
    }
  };

  const appearance = {
    layout: inApp ? {} : { socialButtonsPlacement: "top", socialButtonsVariant: "blockButton" },
    // Dans l'in-app : cacher les boutons sociaux natifs (ils ne marchent pas) + le séparateur.
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
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <img
          src="/mg360-mascot-transparent.png"
          alt="Mongazon360"
          style={{ width: 72, height: 72, objectFit: "contain", display: "block", margin: "0 auto 8px" }}
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

      {/* In-app : bouton Google qui ouvre le vrai navigateur (où Google marche) */}
      {inApp && (
        <div style={{ width: "100%", maxWidth: 400, marginBottom: 16 }}>
          <button onClick={openInRealBrowser} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            background: "#fff", color: "#3c4043", border: "none", borderRadius: 14, padding: "13px 16px",
            fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}>
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continuer avec Google
          </button>
          <div style={{ fontSize: 11, color: "#81c784", textAlign: "center", marginTop: 8, lineHeight: 1.4 }}>
            Ouvre ton navigateur (Google ne fonctionne pas dans Instagram)
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 4px" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(165,214,167,0.25)" }} />
            <span style={{ fontSize: 12, color: "#81c784" }}>ou avec ton email</span>
            <div style={{ flex: 1, height: 1, background: "rgba(165,214,167,0.25)" }} />
          </div>
        </div>
      )}

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
      <div style={{ marginTop: 20, fontSize: 10, color: "#4a7c5c", textAlign: "center", maxWidth: 360, lineHeight: 1.6 }}>
        Mongazon360™ est une marque déposée à l'EUIPO — protégée dans les 27 pays de l'Union européenne.
      </div>
    </div>
  );
}
