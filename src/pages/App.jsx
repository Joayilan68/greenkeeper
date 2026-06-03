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
import { usePilotage }     from "./lib/usePilotage";
import { useUTMCapture }   from "./lib/useUTMCapture";   // ✅ Bloc 1 — capture UTM dès l'arrivée
import { useUTMInjection } from "./lib/useUTMInjection"; // ✅ Bloc 1 — injection Clerk metadata first-touch

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
  useUTMCapture();   // capte les UTM dès l'arrivée sur le site
  useUTMInjection(); // ✅ FIX 01/06/2026 — injecte les UTM dans Clerk unsafeMetadata (first-touch)
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
function useAccessCheck() {
  const { user, isLoaded } = useUser();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      setChecking(false);
      return;
    }

    const email   = user.primaryEmailAddress?.emailAddress || "";
    const isAdmin = ADMIN_EMAILS.includes(email) || user.publicMetadata?.role === "admin";

    if (isAdmin) {
      setAdminFlags();
      setChecking(false);
      return;
    }

    if (localStorage.getItem("mg360_approved") === "true") {
      setChecking(false);
      return;
    }

    if (localStorage.getItem("mg360_waitlist") === "true") {
      setChecking(false);
      return;
    }

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
        localStorage.setItem("mg360_waitlist", "true");
      } finally {
        setChecking(false);
      }
    })();
  }, [isLoaded, user]); // eslint-disable-line

  return { checking };
}

function isOnWaitlist() {
  try {
    return localStorage.getItem("mg360_waitlist") === "true" &&
           localStorage.getItem("mg360_approved") !== "true";
  } catch { return false; }
}

function PrivateRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  );
}

function AppRoutes() {
  const { checking } = useAccessCheck();

  if (checking) return <LoadingScreen />;

  const onWaitlist = isOnWaitlist();

  return (
    <Routes>
      <Route path="/login"             element={<Login />} />
      <Route path="/admin"             element={<Admin />} />

      <Route path="/register"          element={
        <PrivateRoute>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Register />}</PrivateRoute>
      } />

      <Route path="/coming-soon"       element={<PrivateRoute><ComingSoon /></PrivateRoute>} />

      <Route path="/free"              element={<PrivateRoute><Layout><Free /></Layout></PrivateRoute>} />
      <Route path="/subscribe"         element={<PrivateRoute><Subscribe /></PrivateRoute>} />
      <Route path="/subscribe/success" element={<PrivateRoute><SubscribeSuccess /></PrivateRoute>} />

      <Route path="/mentions-legales"  element={<MentionsLegales />} />
      <Route path="/confidentialite"   element={<Confidentialite />} />
      <Route path="/cgu"               element={<CGU />} />
      <Route path="/cgv"               element={<CGV />} />
      <Route path="/cookies"           element={<Cookies />} />

      <Route path="/parametres"        element={
        <PrivateRoute>{onWaitlist ? <Navigate to="/coming-soon" replace /> : <Layout><Settings /></Layout>}</PrivateRoute>
      } />

      <Route path="/pilotage"          element={<Layout><Pilotage /></Layout>} />

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
