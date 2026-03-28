import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Diagnostic from "./pages/Diagnostic";
import MyLawn from "./pages/MyLawn";
import Today from "./pages/Today";
import Products from "./pages/Products";
import History from "./pages/History";
import Setup from "./pages/Setup";
import Login from "./pages/Login";
import Subscribe from "./pages/Subscribe";
import SubscribeSuccess from "./pages/SubscribeSuccess";
import Admin from "./pages/Admin";
import Free from "./pages/free";
import Classement from "./pages/Classement";
import Layout from "./components/Layout";
import { WeatherProvider } from "./lib/WeatherContext";

function AppWithWeather({ children }) {
  return <WeatherProvider>{children}</WeatherProvider>;
}

function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppWithWeather>
        <Routes>
          <Route path="/login"             element={<Login />} />
          <Route path="/admin"             element={<Admin />} />
          <Route path="/free"              element={<SignedIn><Layout><Free /></Layout></SignedIn>} />
          <Route path="/subscribe"         element={<SignedIn><Subscribe /></SignedIn>} />
          <Route path="/subscribe/success" element={<SignedIn><SubscribeSuccess /></SignedIn>} />
          <Route path="/"                  element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/diagnostic"        element={<ProtectedRoute><Layout><Diagnostic /></Layout></ProtectedRoute>} />
          <Route path="/my-lawn"           element={<ProtectedRoute><Layout><MyLawn /></Layout></ProtectedRoute>} />
          <Route path="/today"             element={<ProtectedRoute><Layout><Today /></Layout></ProtectedRoute>} />
          <Route path="/products"          element={<ProtectedRoute><Layout><Products /></Layout></ProtectedRoute>} />
          <Route path="/history"           element={<ProtectedRoute><Layout><History /></Layout></ProtectedRoute>} />
          <Route path="/setup"             element={<ProtectedRoute><Layout><Setup /></Layout></ProtectedRoute>} />
          <Route path="/classement"        element={<ProtectedRoute><Layout><Classement /></Layout></ProtectedRoute>} />
        </Routes>
      </AppWithWeather>
    </BrowserRouter>
  );
}
