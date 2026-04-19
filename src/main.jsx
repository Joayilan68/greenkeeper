import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// ── Error Boundary pour capturer les erreurs silencieuses Chrome ──────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("[MG360] Erreur capturée:", error.message, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#0f2419",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            fontFamily: "monospace",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div
            style={{ color: "#ef9a9a", fontSize: 14, fontWeight: 700, marginBottom: 8 }}
          >
            Erreur de chargement
          </div>
          <div
            style={{
              color: "#ffcc80",
              fontSize: 12,
              background: "rgba(255,255,255,0.05)",
              padding: "12px 16px",
              borderRadius: 8,
              maxWidth: 400,
              wordBreak: "break-all",
            }}
          >
            {this.state.error.message}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Service Worker — mise à jour automatique à chaque déploiement ─────────────
//
// POURQUOI CE CODE EST ICI :
// Sans enregistrement explicite du SW avec la logique updatefound + SKIP_WAITING,
// Chrome continue de servir l'ancien bundle indéfiniment même après un déploiement.
// C'est la cause du bug "index-4Sdt9Jen.js" servi à la place du bundle actuel.
//
// COMMENT ÇA MARCHE :
// 1. On enregistre /sw.js au chargement de la page
// 2. Quand Vercel déploie une nouvelle version, le sw.js est mis à jour
// 3. Chrome détecte le changement → déclenche "updatefound"
// 4. On envoie SKIP_WAITING au nouveau SW → il s'active immédiatement
// 5. "controllerchange" est déclenché → on recharge la page
// 6. Le nouvel index.html pointe vers le nouveau bundle → bundle correct chargé
//
(function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Vérifie les mises à jour toutes les 60 secondes (pour les onglets longtemps ouverts)
        setInterval(() => registration.update(), 60 * 1000);

        // Déclenché quand un nouveau SW est téléchargé
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            // Le nouveau SW est installé et prêt — on force son activation immédiate
            // sans attendre que l'utilisateur ferme tous ses onglets
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch((err) => {
        // Ne pas bloquer l'app si le SW échoue à s'enregistrer
        console.warn("[MG360] SW non enregistré:", err.message);
      });

    // Déclenché après SKIP_WAITING — le nouveau SW a pris le contrôle
    // On recharge pour que index.html pointe vers les nouveaux bundles hashés
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!reloading) {
        reloading = true;
        window.location.reload();
      }
    });
  });
})();

// ── Render ────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/login">
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </ClerkProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
