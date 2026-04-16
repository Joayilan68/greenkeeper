// src/App.jsx
import { useState, useEffect } from "react";
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

// ── Set tous les flags d'accès ─────────────────────────────────────────────────
function setAccessFlags() {
  localStorage.setItem("mg360_approved",        "true");
  localStorage.setItem("mg360_onboarding_done",  "true");
  localStorage.removeItem("mg360_waitlist");
}

function setAdminFlags() {
  setAccessFlags();
  localStorage.setItem("gk_admin_code", "GREENKEEPER2024");
}

function AppWithWeather({ children }) {
  usePilotage();
  return <WeatherProvider>{children}</WeatherProvider>;
}

// ── Wrapper principal — attend Clerk + vérifie Supabase avant tout routing ────
function ClerkReadyRoutes() {
  const { user, isLoaded } = useUser();
  const [ready, setReady]  = useState(false);

  useEffect(() => {
    // Timeout de sécurité — jamais bloqué plus de 3 secondes
    const timeout = setTimeout(() => setReady(true), 3000);

    // Ne pas retourner si !isLoaded — le timeout gère le fallback

    // Pas connecté → prêt immédiatement
    if (!user) {
      clearTimeout(timeout);
      setReady(true);
      return;
    }

    const email   = user.primaryEmailAddress?.emailAddress || "";
    const isAdmin = ADMIN_EMAILS.includes(email) || user.publicMetadata?.role === "admin";

    // Admin → flags immédiats, pas besoin de Supabase
    if (isAdmin) {
      setAdminFlags();
      clearTimeout(timeout);
      setReady(true);
      return;
    }

    // User normal → déjà approuvé en localStorage ? Prêt immédiatement
    if (localStorage.getItem("mg360_approved") === "true") {
      clearTimeout(timeout);
      setReady(true);
      return;
    }

    // User normal sans localStorage → vérifier Supabase (import dynamique — évite crash Chrome)
    (async () => {
      try {
        const { supabase } = await import("./lib/supabase");
        const { data } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .single();
        if (data) setAccessFlags();
      } catch {}
      finally {
        clearTimeout(timeout);
        setReady(true);
      }
    })();

    return () => clearTimeout(timeout);
  }, [isLoaded, user]); // eslint-disable-line

  // Fond sombre neutre pendant la vérification — pas de spinner visible
  if (!ready) return (
    <div style={{ minHeight: "100vh", background: "#0f2419" }} />
  );

  const isApproved = localStorage.getItem("mg360_approved") === "true";
  const onWaitlist = localStorage.getItem("mg360_waitlist") === "true" && !isApproved;

  return (
    <Routes>
      {/* ── Auth ── */}
      <Route path="/login"             element={<Login />} />
      <Route path="/admin"             element={<Admin />} />

      {/* ── Onboarding ── */}
      <Route path="/register"          element={
        <SignedIn>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Register />}</SignedIn>
      } />

      {/* ── Liste d'attente ── */}
      <Route path="/coming-soon"       element={<SignedIn><ComingSoon /></SignedIn>} />

      {/* ── Abonnement ── */}
      <Route path="/free"              element={<SignedIn><Layout><Free /></Layout></SignedIn>} />
      <Route path="/subscribe"         element={<SignedIn><Subscribe /></SignedIn>} />
      <Route path="/subscribe/success" element={<SignedIn><SubscribeSuccess /></SignedIn>} />

      {/* ── Pages légales ── */}
      <Route path="/mentions-legales"  element={<MentionsLegales />} />
      <Route path="/confidentialite"   element={<Confidentialite />} />
      <Route path="/cgu"               element={<CGU />} />
      <Route path="/cgv"               element={<CGV />} />
      <Route path="/cookies"           element={<Cookies />} />

      {/* ── Paramètres ── */}
      <Route path="/parametres"        element={
        <SignedIn>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><Settings /></Layout>}</SignedIn>
      } />

      {/* ── Pilotage Admin ── */}
      <Route path="/pilotage"          element={<Layout><Pilotage /></Layout>} />

      {/* ── App principale ── */}
      <Route path="/"                  element={
        <SignedIn>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><Dashboard /></Layout>}</SignedIn>
      } />
      <Route path="/diagnostic"        element={
        <SignedIn>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><Diagnostic /></Layout>}</SignedIn>
      } />
      <Route path="/my-lawn"           element={
        <SignedIn>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><MyLawn /></Layout>}</SignedIn>
      } />
      <Route path="/today"             element={
        <SignedIn>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><Today /></Layout>}</SignedIn>
      } />
      <Route path="/products"          element={
        <SignedIn>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><Products /></Layout>}</SignedIn>
      } />
      <Route path="/history"           element={
        <SignedIn>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><History /></Layout>}</SignedIn>
      } />
      <Route path="/setup"             element={
        <SignedIn>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><Setup /></Layout>}</SignedIn>
      } />
      <Route path="/classement"        element={
        <SignedIn>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><Classement /></Layout>}</SignedIn>
      } />
      <Route path="/rappels"           element={
        <SignedIn>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><Rappels /></Layout>}</SignedIn>
      } />

      <Route path="*" element={<SignedOut><RedirectToSignIn /></SignedOut>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppWithWeather>
        <ClerkReadyRoutes />
      </AppWithWeather>
    </BrowserRouter>
  );
}
