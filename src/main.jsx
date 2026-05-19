import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// ── Guard global — Notification API ──────────────────────────────────────────
// Safari iOS, WebViews Messenger/Facebook/Instagram/TikTok/WhatsApp
// n'exposent pas window.Notification → crash immédiat si accédé sans vérification.
// On définit un stub NO-OP pour éviter tout crash en cascade.
if (typeof window !== "undefined" && !("Notification" in window)) {
  window.Notification = {
    permission: "denied",
    requestPermission: () => Promise.resolve("denied"),
  };
}

// ── Détection in-app browser ──────────────────────────────────────────────────
// Messenger, Facebook, Instagram, TikTok, WhatsApp, LinkedIn
// ouvrent les liens dans leur propre WebView avec des limitations sévères.
// On redirige vers le vrai navigateur pour garantir une expérience correcte.
function detectInAppBrowser() {
  const ua = navigator.userAgent || "";
  const isInApp =
    /FBAN|FBAV|Instagram|LinkedInApp|TikTok|Twitter|Line\/|MicroMessenger|WhatsApp/i.test(ua) ||
    (ua.includes("Mobile") && ua.includes("Safari") && !ua.includes("Chrome") && document.referrer.includes("messenger"));
  return isInApp;
}

function InAppBrowserBanner() {
  const handleOpen = () => {
    // Tenter d'ouvrir dans le navigateur par défaut
    const url = window.location.href;
    // iOS : ouvre Safari
    // Android : ouvre le navigateur par défaut
    window.location.href = `googlechrome://navigate?url=${encodeURIComponent(url)}`;
    setTimeout(() => { window.location.href = url; }, 500);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #1a3d2b 0%, #0f2419 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 24px", textAlign: "center",
      fontFamily: "'Nunito', sans-serif",
    }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>🌿</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#F1F8F2", marginBottom: 12 }}>
        Mongazon360
      </div>
      <div style={{ fontSize: 14, color: "#81c784", marginBottom: 24, lineHeight: 1.6, maxWidth: 300 }}>
        Pour une expérience optimale, ouvrez l'application dans votre navigateur habituel.
      </div>
      <button
        onClick={handleOpen}
        style={{
          background: "linear-gradient(135deg,#43a047,#2e7d32)",
          color: "#fff", border: "none", borderRadius: 14,
          padding: "14px 28px", fontSize: 15, fontWeight: 800,
          cursor: "pointer", marginBottom: 16,
          boxShadow: "0 4px 16px rgba(46,125,50,0.4)",
        }}
      >
        Ouvrir dans le navigateur →
      </button>
      <div style={{ fontSize: 11, color: "#4a7c5c", lineHeight: 1.6 }}>
        Copiez ce lien si le bouton ne fonctionne pas :<br />
        <span style={{ color: "#66BB6A", fontWeight: 700 }}>mongazon360.fr</span>
      </div>
    </div>
  );
}

// ── Error Boundary ────────────────────────────────────────────────────────────
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
        <div style={{
          minHeight: "100vh", background: "#0f2419",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "24px", fontFamily: "monospace",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div style={{ color: "#ef9a9a", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            Erreur de chargement
          </div>
          <div style={{
            color: "#ffcc80", fontSize: 12,
            background: "rgba(255,255,255,0.05)",
            padding: "12px 16px", borderRadius: 8,
            maxWidth: 400, wordBreak: "break-all",
          }}>
            {this.state.error.message}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Service Worker ────────────────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("[MG360] SW non enregistré:", err.message));
  });
}

// ── Render ────────────────────────────────────────────────────────────────────
// Si in-app browser détecté → afficher la bannière de redirection
// sinon → app normale
const isInApp = detectInAppBrowser();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isInApp ? (
        <InAppBrowserBanner />
      ) : (
        <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/login">
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </ClerkProvider>
      )}
    </ErrorBoundary>
  </React.StrictMode>
);
