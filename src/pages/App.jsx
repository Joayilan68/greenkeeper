// src/App.jsx
import { useEffect, useState } from "react";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/clerk-react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Diagnostic from "./pages/Diagnostic";
import Classement from "./pages/Classement";
import MyLawn from "./pages/MyLawn";
import Today from "./pages/Today";
import Products from "./pages/Products";
import History from "./pages/History";
import Setup from "./pages/Setup";
import Login from "./pages/Login";
import Subscribe from "./pages/Subscribe";
import SubscribeSuccess from "./pages/SubscribeSuccess";
import Admin from "./pages/Admin";
import Free from "./pages/Free";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import Pilotage from "./pages/Pilotage";
import { MentionsLegales, Confidentialite, CGU, CGV, Cookies } from "./pages/Legal";
import Layout from "./components/Layout";
import ComingSoon from "./components/ComingSoon";
import { WeatherProvider } from "./lib/WeatherContext";
import { usePilotage } from "./lib/usePilotage";

// ── Emails admin — accès permanent garanti ────────────────────────────────────
const ADMIN_EMAILS = ["mongazon360@gmail.com", "jordankrebs1@gmail.com"];

function setAdminFlags() {
  localStorage.setItem("mg360_approved",        "true");
  localStorage.setItem("mg360_onboarding_done",  "true");
  localStorage.setItem("gk_admin_code",          "GREENKEEPER2024");
  localStorage.removeItem("mg360_waitlist");
}

function setUserFlags() {
  localStorage.setItem("mg360_approved",        "true");
  localStorage.setItem("mg360_onboarding_done",  "true");
  localStorage.removeItem("mg360_waitlist");
}

function AppWithWeather({ children }) {
  usePilotage();
  return <WeatherProvider>{children}</WeatherProvider>;
}

// ── Écran de chargement pendant la vérification d'accès ──────────────────────
function LoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #1a3d2b 0%, #0f2419 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🌿</div>
        <div style={{ width: 32, height: 32, border: "3px solid rgba(82,183,136,0.3)",
          borderTop: "3px solid #52b788", borderRadius: "50%",
          animation: "spin 1s linear infinite", margin: "0 auto" }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

// ── Hook qui vérifie l'accès et retourne l'état de chargement ────────────────
// Bloque le rendu des routes jusqu'à ce que la vérification Supabase soit terminée.
// Sans ça, isOnWaitlist() retourne false avant que le flag soit posé → Dashboard visible.
function useAccessCheck() {
  const { user, isLoaded } = useUser();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Clerk pas encore chargé → on attend
    if (!isLoaded) return;

    // Pas d'utilisateur connecté → pas de vérification nécessaire
    if (!user) {
      setChecking(false);
      return;
    }

    const email   = user.primaryEmailAddress?.emailAddress || "";
    const isAdmin = ADMIN_EMAILS.includes(email) || user.publicMetadata?.role === "admin";

    // Admin → flags immédiats, pas besoin de Supabase
    if (isAdmin) {
      setAdminFlags();
      setChecking(false);
      return;
    }

    // Déjà approuvé en localStorage → pas besoin de vérifier Supabase
    if (localStorage.getItem("mg360_approved") === "true") {
      setChecking(false);
      return;
    }

    // Déjà en waitlist → pas besoin de vérifier Supabase
    if (localStorage.getItem("mg360_waitlist") === "true") {
      setChecking(false);
      return;
    }

    // Nouvel utilisateur inconnu → vérifier Supabase avant d'afficher quoi que ce soit
    (async () => {
      try {
        const { supabase } = await import("./lib/supabase");
        const { data } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .single();

        if (data) {
          setUserFlags();
        } else {
          localStorage.setItem("mg360_waitlist", "true");
        }
      } catch {
        // Erreur réseau → waitlist par sécurité
        localStorage.setItem("mg360_waitlist", "true");
      } finally {
        setChecking(false);
      }
    })();
  }, [isLoaded, user]); // eslint-disable-line

  return { checking };
}

// ── Vérification waitlist synchrone ──────────────────────────────────────────
function isOnWaitlist() {
  try {
    return localStorage.getItem("mg360_waitlist") === "true" &&
           localStorage.getItem("mg360_approved") !== "true";
  } catch { return false; }
}

// ── Wrapper pour protéger les routes privées ──────────────────────────────────
function PrivateRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  );
}

// ── Routes principales ────────────────────────────────────────────────────────
function AppRoutes() {
  const { checking } = useAccessCheck();

  // Bloque tout rendu jusqu'à ce que la vérification d'accès soit terminée
  if (checking) return <LoadingScreen />;

  const onWaitlist = isOnWaitlist();

  return (
    <Routes>
      {/* ── Auth ── */}
      <Route path="/login"             element={<Login />} />
      <Route path="/admin"             element={<Admin />} />

      {/* ── Onboarding ── */}
      <Route path="/register"          element={
        <PrivateRoute>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Register />}</PrivateRoute>
      } />

      {/* ── Liste d'attente ── */}
      <Route path="/coming-soon"       element={<PrivateRoute><ComingSoon /></PrivateRoute>} />

      {/* ── Abonnement ── */}
      <Route path="/free"              element={<PrivateRoute><Layout><Free /></Layout></PrivateRoute>} />
      <Route path="/subscribe"         element={<PrivateRoute><Subscribe /></PrivateRoute>} />
      <Route path="/subscribe/success" element={<PrivateRoute><SubscribeSuccess /></PrivateRoute>} />

      {/* ── Pages légales ── */}
      <Route path="/mentions-legales"  element={<MentionsLegales />} />
      <Route path="/confidentialite"   element={<Confidentialite />} />
      <Route path="/cgu"               element={<CGU />} />
      <Route path="/cgv"               element={<CGV />} />
      <Route path="/cookies"           element={<Cookies />} />

      {/* ── Paramètres ── */}
      <Route path="/parametres"        element={
        <PrivateRoute>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><Settings /></Layout>}</PrivateRoute>
      } />

      {/* ── Pilotage Admin ── */}
      <Route path="/pilotage"          element={<Layout><Pilotage /></Layout>} />

      {/* ── App principale ── */}
      <Route path="/"                  element={
        <PrivateRoute>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><Dashboard /></Layout>}</PrivateRoute>
      } />
      <Route path="/diagnostic"        element={
        <PrivateRoute>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><Diagnostic /></Layout>}</PrivateRoute>
      } />
      <Route path="/my-lawn"           element={
        <PrivateRoute>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><MyLawn /></Layout>}</PrivateRoute>
      } />
      <Route path="/today"             element={
        <PrivateRoute>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><Today /></Layout>}</PrivateRoute>
      } />
      <Route path="/products"          element={
        <PrivateRoute>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><Products /></Layout>}</PrivateRoute>
      } />
      <Route path="/history"           element={
        <PrivateRoute>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><History /></Layout>}</PrivateRoute>
      } />
      <Route path="/setup"             element={
        <PrivateRoute>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><Setup /></Layout>}</PrivateRoute>
      } />
      <Route path="/classement"        element={
        <PrivateRoute>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><Classement /></Layout>}</PrivateRoute>
      } />
      <Route path="*" element={<SignedOut><RedirectToSignIn /></SignedOut>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppWithWeather>
        <AppRoutes />
      </AppWithWeather>
    </BrowserRouter>
  );
}
 