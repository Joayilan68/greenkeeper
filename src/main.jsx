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
            color: "#ffcc80", fontSize: 12, background: "rgba(255,255,255,0.05)",
            padding: "12px 16px", borderRadius: 8, maxWidth: 400, wordBreak: "break-all",
          }}>
            {this.state.error.message}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
