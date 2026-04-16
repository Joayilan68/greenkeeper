// src/lib/useSubscription.js
import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";

const ADMIN_EMAILS = ["mongazon360@gmail.com", "jordankrebs1@gmail.com"];
const ADMIN_CODE   = "GREENKEEPER2024";

// ── Set tous les flags admin en localStorage ──────────────────────────────────
function setAdminFlags() {
  localStorage.setItem("mg360_approved",       "true");
  localStorage.setItem("gk_admin_code",         ADMIN_CODE);
  localStorage.setItem("mg360_onboarding_done", "true");
  localStorage.removeItem("mg360_waitlist");
}

export function useSubscription() {
  const { isSignedIn }     = useAuth();
  const { user, isLoaded } = useUser();
  const [tier, setTier]    = useState(() => {
    // Init synchrone : si gk_admin_code déjà en localStorage → admin direct
    if (typeof window !== "undefined" &&
        localStorage.getItem("gk_admin_code") === ADMIN_CODE) return "admin";
    return "free";
  });
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    // 1. Email admin hardcodé → tier admin garanti
    if (user) {
      const email = user.primaryEmailAddress?.emailAddress || "";
      if (ADMIN_EMAILS.includes(email) || user.publicMetadata?.role === "admin") {
        setAdminFlags();
        setTier("admin");
        setLoading(false);
        return;
      }
    }

    // 2. localStorage admin code
    if (localStorage.getItem("gk_admin_code") === ADMIN_CODE) {
      setTier("admin"); setLoading(false); return;
    }

    if (!isSignedIn || !user) { setTier("free"); setLoading(false); return; }

    // 3. Abonnement Stripe actif
    const meta = user.publicMetadata || {};
    const subscribed = meta.isSubscribed === true ||
                       meta.subscriptionStatus === "active" ||
                       meta.subscriptionStatus === "trialing";
    setTier(subscribed ? "paid" : "free");
    setLoading(false);
  }, [isSignedIn, isLoaded, user]); // eslint-disable-line

  const activateAdmin = (code) => {
    if (code.trim().toUpperCase() === ADMIN_CODE) {
      setAdminFlags();
      setTier("admin");
      return true;
    }
    return false;
  };

  return {
    tier,
    isAdmin:      tier === "admin",
    isPaid:       tier === "paid" || tier === "admin",
    isFree:       tier === "free",
    isSubscribed: tier === "paid" || tier === "admin",
    isLoading,
    activateAdmin,
  };
}
