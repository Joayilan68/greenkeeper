// src/App.jsx
import { useEffect } from "react";
import { SignedIn, SignedOut, RedirectToSignIn, useUser, useAuth } from "@clerk/clerk-react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import Dashboard from "./pages/Dashboard";
import Diagnostic from "./pages/Diagnostic";
import Classement from "./pages/Classement";
import MyLawn from "./pages/MyLawn";
import Today from "./pages/Today";
import Products from "./pages/Products";
import History from "./pages/History";
import Setup from "./pages/Setup";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import EssaiDiagnostic from "./pages/EssaiDiagnostic";
import DemoApp from "./pages/DemoApp";
import Subscribe from "./pages/Subscribe";
import SubscribeSuccess from "./pages/SubscribeSuccess";
import Admin from "./pages/Admin";
import Free from "./pages/Free";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import Pilotage from "./pages/Pilotage";
import Parcours from "./pages/Parcours";
import { MentionsLegales, Confidentialite, CGU, CGV, Cookies } from "./pages/Legal";
import Layout from "./components/Layout";
import { WeatherProvider } from "./lib/WeatherContext";
import { usePilotage }     from "./lib/usePilotage";
import { useSubscription } from "./lib/useSubscription"; // ✅ statut Premium → WeatherProvider (ET₀/sol)
import { useUTMCapture }   from "./lib/useUTMCapture";   // ✅ Bloc 1 — capture UTM dès l'arrivée
import { useUTMInjection } from "./lib/useUTMInjection"; // ✅ Bloc 1 — injection Clerk metadata first-touch
import { trackFunnel }     from "./lib/funnel";          // ✅ suivi d'entonnoir (conversion)
import { isAnonPending, getAnonIdIfAny, setAnonPending } from "./lib/anonId"; // ✅ rattachement diagnostic anonyme
import CookieBanner        from "./components/CookieBanner"; // ✅ consentement cookies (RGPD)
import { getCookieConsent } from "./lib/cookieConsent";
import { loadMetaPixel, pixelTrack } from "./lib/metaPixel"; // ✅ Meta Pixel (après consentement)

// ── Emails admin — accès permanent garanti ────────────────────────────────────
const ADMIN_EMAILS = ["mongazon360@gmail.com", "jordankrebs1@gmail.com"];

// ── Présence quotidienne (DAU) ───────────────────────────────────────────────
// Enregistre 1 ligne par utilisateur par jour dans daily_active_users.
// Idempotent (clé composite user_id+day) + garde localStorage : 1 écriture/jour/appareil.
// Hors admin (appelé uniquement pour les non-admins). Non bloquant.
async function pingPresence(userId) {
  if (!userId) return;
  try {
    const today = new Date().toLocaleDateString("fr-CA"); // YYYY-MM-DD
    const key   = `mg360_dau_ping_${today}`;
    if (localStorage.getItem(key)) return; // déjà compté aujourd'hui sur cet appareil
    const { supabase } = await import("./lib/supabase");
    const { error } = await supabase
      .from("daily_active_users")
      .upsert({ user_id: userId, day: today }, { onConflict: "user_id,day", ignoreDuplicates: true });
    if (!error) localStorage.setItem(key, "1");
  } catch { /* non bloquant */ }
}

// ── Compteur de visites du site (anonyme, 1 par navigateur/jour) ──────────────
// Écrit directement en base via la clé anon (pas d'endpoint → reste sous le
// plafond des 12 fonctions Vercel). Garde localStorage = 1 visite/jour/appareil.
// Compte TOUS les visiteurs, y compris non connectés (landing) → vraie "visite".
function pingVisit() {
  try {
    const today = new Date().toLocaleDateString("fr-CA"); // YYYY-MM-DD
    const key   = `mg360_visit_${today}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1"); // pose le garde AVANT l'insert (anti double-comptage)
    import("./lib/supabase").then(({ supabase }) => {
      supabase.from("site_visits")
        .insert({ path: typeof location !== "undefined" ? location.pathname : null })
        .then(() => {}, () => {});
    }).catch(() => {});
  } catch { /* non bloquant */ }
}

function AppWithWeather({ children }) {
  usePilotage();
  useUTMCapture();   // capte les UTM dès l'arrivée sur le site
  useUTMInjection(); // ✅ FIX 01/06/2026 — injecte les UTM dans Clerk unsafeMetadata (first-touch)

  // Meta Pixel : charger dès le démarrage SI le visiteur a déjà accepté les cookies.
  useEffect(() => { if (getCookieConsent() === "granted") loadMetaPixel(); }, []);

  // Compteur de visites = haut d'entonnoir : UNIQUEMENT les visiteurs NON connectés
  // (les prospects qui arrivent sur la landing). Les connectés sont déjà comptés
  // dans "Actifs aujourd'hui" → on ne les compte pas deux fois.
  const { user: visitUser, isLoaded: visitLoaded } = useUser();
  const { getToken } = useAuth();
  useEffect(() => {
    if (!visitLoaded) return; // attendre Clerk pour connaître l'état de connexion
    if (visitUser) return;    // connecté → c'est un "actif", pas un prospect
    pingVisit();              // visiteur anonyme = prospect arrivé sur la landing
  }, [visitLoaded, visitUser]);

  // Suivi d'entonnoir : bas de tunnel — l'inscription vient d'aboutir.
  // On détecte un compte "tout neuf" (créé il y a < 10 min) une seule fois.
  useEffect(() => {
    if (!visitLoaded || !visitUser) return;
    try {
      const key = `mg360_signup_tracked_${visitUser.id}`;
      if (localStorage.getItem(key)) return;
      const createdMs = visitUser.createdAt ? new Date(visitUser.createdAt).getTime() : 0;
      const isFresh = createdMs && (Date.now() - createdMs) < 10 * 60 * 1000;
      if (isFresh) {
        trackFunnel("signup_completed");
        pixelTrack("CompleteRegistration"); // remonte l'inscription à Meta (si pixel chargé)
        localStorage.setItem(key, "1");
      }
    } catch { /* non bloquant */ }
  }, [visitLoaded, visitUser]);

  // Rattachement : si un diagnostic anonyme attend (fait avant inscription),
  // on le rattache au compte fraîchement connecté — sans lui refaire la photo.
  useEffect(() => {
    if (!visitLoaded || !visitUser) return;
    if (!isAnonPending()) return;
    (async () => {
      try {
        const anonId = getAnonIdIfAny();
        if (!anonId) { setAnonPending(false); return; }
        const token = await getToken();
        if (!token) return; // on retentera au prochain chargement
        await fetch("/api/analyze-lawn", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ action: "claim-anon", anonId }),
        });
        setAnonPending(false);
      } catch { /* non bloquant — retenté au prochain chargement */ }
    })();
  }, [visitLoaded, visitUser]);

  const { isPaid } = useSubscription(); // ✅ transmet le statut Premium → active ET₀/sol dans la météo
  return <WeatherProvider isPaid={isPaid}>{children}</WeatherProvider>;
}

// ── Écran de chargement pendant l'initialisation de Clerk ──────────────────────
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

// ── Attente du chargement Clerk + présence quotidienne ──────────────────────
// Écran de chargement tant que Clerk n'a pas déterminé l'état de connexion.
// Tout utilisateur connecté a accès à l'app (plus de liste d'attente depuis l'ouverture).
function useAuthReady() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;
    const email   = user.primaryEmailAddress?.emailAddress || "";
    const isAdmin = ADMIN_EMAILS.includes(email) || user.publicMetadata?.role === "admin";
    if (!isAdmin) pingPresence(user.id); // DAU — compter l'utilisateur (hors admin) une fois par jour
  }, [isLoaded, user]);

  return isLoaded;
}

function PrivateRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  );
}

// ── Route admin uniquement ────────────────────────────────────────────────────
function AdminRoute({ children }) {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return null;
  const email   = user?.primaryEmailAddress?.emailAddress || "";
  const isAdmin = ADMIN_EMAILS.includes(email) || user?.publicMetadata?.role === "admin";
  if (!isAdmin) return <Navigate to="/" replace />;
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  );
}

function AppRoutes() {
  const authReady = useAuthReady();

  if (!authReady) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/login"             element={<Login mode="signin" />} />
      <Route path="/signup"            element={<Login mode="signup" />} />
      <Route path="/essai"             element={<EssaiDiagnostic />} />
      <Route path="/demo"              element={<DemoApp />} />
      <Route path="/admin"             element={<Admin />} />
      <Route path="/register"          element={<PrivateRoute><Register /></PrivateRoute>} />

      <Route path="/free"              element={<PrivateRoute><Layout><Free /></Layout></PrivateRoute>} />
      <Route path="/subscribe"         element={<PrivateRoute><Subscribe /></PrivateRoute>} />
      <Route path="/subscribe/success" element={<PrivateRoute><SubscribeSuccess /></PrivateRoute>} />

      <Route path="/mentions-legales"  element={<MentionsLegales />} />
      <Route path="/confidentialite"   element={<Confidentialite />} />
      <Route path="/cgu"               element={<CGU />} />
      <Route path="/cgv"               element={<CGV />} />
      <Route path="/cookies"           element={<Cookies />} />

      <Route path="/parametres"        element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />
      <Route path="/pilotage"          element={<AdminRoute><Layout><Pilotage /></Layout></AdminRoute>} />

      <Route path="/"                  element={<><SignedIn><Layout><Dashboard /></Layout></SignedIn><SignedOut><Landing /></SignedOut></>} />
      <Route path="/diagnostic"        element={<PrivateRoute><Layout><Diagnostic /></Layout></PrivateRoute>} />
      <Route path="/my-lawn"           element={<PrivateRoute><Layout><MyLawn /></Layout></PrivateRoute>} />
      <Route path="/parcours"          element={<PrivateRoute><Layout><Parcours /></Layout></PrivateRoute>} />
      <Route path="/today"             element={<PrivateRoute><Layout><Today /></Layout></PrivateRoute>} />
      <Route path="/products"          element={<PrivateRoute><Layout><Products /></Layout></PrivateRoute>} />
      <Route path="/history"           element={<PrivateRoute><Layout><History /></Layout></PrivateRoute>} />
      <Route path="/setup"             element={<PrivateRoute><Layout><Setup /></Layout></PrivateRoute>} />
      <Route path="/classement"        element={<PrivateRoute><Layout><Classement /></Layout></PrivateRoute>} />
      <Route path="*"                  element={<SignedOut><RedirectToSignIn /></SignedOut>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppWithWeather>
        <AppRoutes />
      </AppWithWeather>
      <CookieBanner />
      <Analytics />
    </BrowserRouter>
  );
}
