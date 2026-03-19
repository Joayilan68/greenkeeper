import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Today from "./pages/Today";
import Week from "./pages/Week";
import History from "./pages/History";
import Setup from "./pages/Setup";
import Login from "./pages/Login";
import Subscribe from "./pages/Subscribe";
import SubscribeSuccess from "./pages/SubscribeSuccess";
import Admin from "./pages/Admin";
import Free from "./pages/Free";
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
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/Free" element={<SignedIn><Layout><Free /></Layout></SignedIn>} />
          <Route path="/subscribe" element={<SignedIn><Subscribe /></SignedIn>} />
          <Route path="/subscribe/success" element={<SignedIn><SubscribeSuccess /></SignedIn>} />
          <Route path="/" element={<ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>} />
          <Route path="/today" element={<ProtectedRoute><Layout><Today /></Layout></ProtectedRoute>} />
          <Route path="/week" element={<ProtectedRoute><Layout><Week /></Layout></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><Layout><History /></Layout></ProtectedRoute>} />
          <Route path="/setup" element={<ProtectedRoute><Layout><Setup /></Layout></ProtectedRoute>} />
        </Routes>
      </AppWithWeather>
    </BrowserRouter>
  );
}
