// src/App.jsx
import { useEffect } from "react";
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
import Rappels from "./pages/Rappels";
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

// ── Hook qui set les flags en arrière-plan — sans bloquer le rendu ────────────
function useAccessFlags() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const email   = user.primaryEmailAddress?.emailAddress || "";
    const isAdmin = ADMIN_EMAILS.includes(email) || user.publicMetadata?.role === "admin";

    if (isAdmin) {
      setAdminFlags();
      return;
    }

    // User normal — vérifier Supabase si pas encore approuvé
    if (localStorage.getItem("mg360_approved") !== "true") {
      (async () => {
        try {
          const { supabase } = await import("./lib/supabase");
          const { data } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("user_id", user.id)
            .single();
          if (data) setUserFlags();
        } catch {}
      })();
    }
  }, [isLoaded, user]); // eslint-disable-line
}

// ── Vérification waitlist synchrone ──────────────────────────────────────────
function isOnWaitlist() {
  try {
    return localStorage.getItem("mg360_waitlist") === "true" &&
           localStorage.getItem("mg360_approved") !== "true";
  } catch { return false; }
}

// ── Wrapper pour protéger les routes privées ──────────────────────────────────
// Affiche le contenu si connecté, redirige vers /login si non connecté.
// Résout le bug "écran vert vide" quand SignedIn rend rien sans SignedOut.
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
  useAccessFlags();
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
      <Route path="/rappels"           element={
        <PrivateRoute>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><Rappels /></Layout>}</PrivateRoute>
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
