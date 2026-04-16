// src/App.jsx
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

function AppWithWeather({ children }) {
  usePilotage();
  return <WeatherProvider>{children}</WeatherProvider>;
}

// ── Emails admin — accès garanti sans localStorage ───────────────────────────
const ADMIN_EMAILS = ["mongazon360@gmail.com", "jordankrebs1@gmail.com"];

// ── Wrapper qui attend Clerk ET set les flags admin avant tout routing ────────
function ClerkReadyRoutes() {
  const { user, isLoaded } = useUser();

  // Attendre que Clerk soit prêt — aucune route ne se rend avant
  if (!isLoaded) return null;

  // Clerk est prêt — vérifier admin de façon synchrone
  if (user) {
    const email = user.primaryEmailAddress?.emailAddress || "";
    const isAdmin = ADMIN_EMAILS.includes(email) || user.publicMetadata?.role === "admin";
    if (isAdmin) {
      localStorage.setItem("mg360_approved", "true");
      localStorage.setItem("gk_admin_code", "GREENKEEPER2024");
      localStorage.setItem("mg360_onboarding_done", "true"); // empêche onboarding Dashboard
      localStorage.removeItem("mg360_waitlist");
    }
  }

  const isApproved = localStorage.getItem("mg360_approved") === "true";
  const onWaitlist = localStorage.getItem("mg360_waitlist") === "true" && !isApproved;

  return (
    <Routes>
      {/* ── Auth ── */}
      <Route path="/login"             element={<Login />} />
      <Route path="/admin"             element={<Admin />} />

      {/* ── Onboarding & consentements RGPD ── */}
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

      {/* Redirect non-signed-in users */}
      <Route path="*"                  element={<SignedOut><RedirectToSignIn /></SignedOut>} />
    </Routes>
  );
}

// ── Gardes inutilisés — remplacés par ClerkReadyRoutes ───────────────────────
function ProtectedRoute({ children }) { return children; }
function RegisterRoute() { return <Register />; }

export default function App() {
  return (
    <BrowserRouter>
      <AppWithWeather>
        <ClerkReadyRoutes />
      </AppWithWeather>
    </BrowserRouter>
  );
}
