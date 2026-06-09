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

// localStorage = cache court terme UNIQUEMENT (évite un flash au rechargement)
// Source de vérité = Supabase. Durée de cache : 1h max.
const ACCESS_CACHE_KEY = "mg360_access_cache";
const ACCESS_CACHE_TTL = 60 * 60 * 1000; // 1h en ms

function getAccessCache() {
  try {
    const raw = localStorage.getItem(ACCESS_CACHE_KEY);
    if (!raw) return null;
    const { status, ts } = JSON.parse(raw);
    if (Date.now() - ts > ACCESS_CACHE_TTL) {
      localStorage.removeItem(ACCESS_CACHE_KEY);
      return null;
    }
    return status; // "approved" | "waitlist" | "admin"
  } catch { return null; }
}

function setAccessCache(status) {
  try {
    localStorage.setItem(ACCESS_CACHE_KEY, JSON.stringify({ status, ts: Date.now() }));
  } catch {}
}

function clearAccessCache() {
  try { localStorage.removeItem(ACCESS_CACHE_KEY); } catch {}
}

function setAdminFlags() {
  setAccessCache("admin");
  // Rétrocompat — certains composants lisent encore ces clés
  try {
    localStorage.setItem("mg360_approved",       "true");
    localStorage.setItem("mg360_onboarding_done", "true");
    localStorage.setItem("gk_admin_code",         "GREENKEEPER2024");
    localStorage.removeItem("mg360_waitlist");
  } catch {}
}

function setUserFlags() {
  setAccessCache("approved");
  try {
    localStorage.setItem("mg360_approved",       "true");
    localStorage.setItem("mg360_onboarding_done", "true");
    localStorage.removeItem("mg360_waitlist");
  } catch {}
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

// ── Hook qui vérifie l'accès — SOURCE DE VÉRITÉ = SUPABASE ──────────────────
// localStorage = cache 1h uniquement pour éviter le flash au rechargement.
// Sur nouveau device, Safari iOS (efface localStorage après 7j), ou cache expiré :
// on retombe systématiquement sur Supabase → aucun user ne se retrouve bloqué.
function useAccessCheck() {
  const { user, isLoaded } = useUser();
  const [checking,  setChecking]  = useState(true);
  const [accessStatus, setAccessStatus] = useState(null); // "approved"|"waitlist"|"admin"|null

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      setChecking(false);
      return;
    }

    const email   = user.primaryEmailAddress?.emailAddress || "";
    const isAdmin = ADMIN_EMAILS.includes(email) || user.publicMetadata?.role === "admin";

    // Admin → toujours approuvé, pas besoin de Supabase
    if (isAdmin) {
      setAdminFlags();
      setAccessStatus("admin");
      setChecking(false);
      return;
    }

    // Cache valide (< 1h) → on évite le round-trip Supabase pour le rechargement
    const cached = getAccessCache();
    if (cached) {
      setAccessStatus(cached);
      setChecking(false);
      // Revalide en arrière-plan sans bloquer l'UI
      (async () => {
        try {
          const { supabase } = await import("./lib/supabase");
          const { data: profileData } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();
          if (profileData) {
            setUserFlags();
            setAccessStatus("approved");
          } else {
            // Pas de profil → vérifier user_access avant de mettre en waitlist
            const { data: accessData } = await supabase
              .from("user_access")
              .select("status")
              .eq("user_id", user.id)
              .maybeSingle();
            if (accessData?.status === "approved" || accessData?.status === "guest") {
              setUserFlags();
              setAccessStatus("approved");
            } else {
              clearAccessCache();
              try { localStorage.setItem("mg360_waitlist", "true"); } catch {}
              setAccessStatus("waitlist");
            }
          }
        } catch { /* réseau offline — on garde le cache */ }
      })();
      return;
    }

    // Pas de cache ou cache expiré → vérification Supabase obligatoire
    (async () => {
      try {
        const { supabase } = await import("./lib/supabase");
        // 1. Vérifier profiles (user a terminé l'onboarding)
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileData) {
          setUserFlags();
          setAccessStatus("approved");
          return;
        }

        // 2. Pas de profil → vérifier user_access (guest ou approved sans profil)
        // Couvre : guest code, code admin, préinscrit qui n'a pas fini l'onboarding
        const { data: accessData } = await supabase
          .from("user_access")
          .select("status")
          .eq("user_id", user.id)
          .maybeSingle();

        if (accessData?.status === "approved" || accessData?.status === "guest") {
          setUserFlags();
          setAccessStatus("approved");
        } else {
          clearAccessCache();
          try {
            localStorage.setItem("mg360_waitlist", "true");
            localStorage.removeItem("mg360_approved");
          } catch {}
          setAccessStatus("waitlist");
        }
      } catch {
        // Erreur réseau — fallback sur l'ancien localStorage pour ne pas bloquer
        try {
          const legacy = localStorage.getItem("mg360_approved");
          if (legacy === "true") {
            setAccessStatus("approved");
          } else {
            setAccessStatus("waitlist");
          }
        } catch {
          setAccessStatus("waitlist");
        }
      } finally {
        setChecking(false);
      }
    })();
  }, [isLoaded, user]); // eslint-disable-line

  return { checking, accessStatus };
}

function isOnWaitlist(accessStatus) {
  // Priorité sur accessStatus (state React) si disponible
  if (accessStatus !== null) return accessStatus === "waitlist";
  // Fallback localStorage (rétrocompat)
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
  const { checking, accessStatus } = useAccessCheck();

  if (checking) return <LoadingScreen />;

  const onWaitlist = isOnWaitlist(accessStatus);

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
