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

// ── Helpers waitlist ──────────────────────────────────────────────────────────
function isOnWaitlist() {
  try {
    return localStorage.getItem("mg360_waitlist") === "true" &&
           localStorage.getItem("mg360_approved") !== "true";
  } catch { return false; }
}

// ── Route protégée avec vérification waitlist ─────────────────────────────────
function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>
        {isOnWaitlist()
          ? <Navigate to="/coming-soon" replace />
          : children
        }
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

// ── Route post-inscription : redirige vers coming-soon si waitlist ────────────
function RegisterRoute() {
  return (
    <SignedIn>
      {isOnWaitlist()
        ? <Navigate to="/coming-soon" replace />
        : <Register />
      }
    </SignedIn>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppWithWeather>
        <Routes>
          {/* ── Auth ── */}
          <Route path="/login"             element={<Login />} />
          <Route path="/admin"             element={<Admin />} />

          {/* ── Onboarding & consentements RGPD ── */}
          <Route path="/register"          element={<RegisterRoute />} />

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
          <Route path="/parametres"        element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />

          {/* ── Pilotage Admin ── */}
          <Route path="/pilotage"          element={<Layout><Pilotage /></Layout>} />

          {/* ── App principale ── */}
          <Route path="/"                  element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/diagnostic"        element={<ProtectedRoute><Layout><Diagnostic /></Layout></ProtectedRoute>} />
          <Route path="/my-lawn"           element={<ProtectedRoute><Layout><MyLawn /></Layout></ProtectedRoute>} />
          <Route path="/today"             element={<ProtectedRoute><Layout><Today /></Layout></ProtectedRoute>} />
          <Route path="/products"          element={<ProtectedRoute><Layout><Products /></Layout></ProtectedRoute>} />
          <Route path="/history"           element={<ProtectedRoute><Layout><History /></Layout></ProtectedRoute>} />
          <Route path="/setup"             element={<ProtectedRoute><Layout><Setup /></Layout></ProtectedRoute>} />
          <Route path="/classement"        element={<ProtectedRoute><Layout><Classement /></Layout></ProtectedRoute>} />
          <Route path="/rappels"           element={<ProtectedRoute><Layout><Rappels /></Layout></ProtectedRoute>} />
        </Routes>
      </AppWithWeather>
    </BrowserRouter>
  );
}
