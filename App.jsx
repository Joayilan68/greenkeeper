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

// ── Routes principales ────────────────────────────────────────────────────────
function AppRoutes() {
  useAccessFlags(); // Set flags en arrière-plan, ne bloque pas le rendu
  const onWaitlist = isOnWaitlist();

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
        <AppRoutes />
      </AppWithWeather>
    </BrowserRouter>
  );
}
